/**
 * ML Scoring Service
 * Predictive lead scoring using machine learning
 *
 * Uses simple logistic regression for MVP
 * Can be extended to XGBoost/Random Forest for production
 */

import { PrismaClient } from '@prisma/client';
import { log } from '../utils/logger';

const prisma = new PrismaClient();

export interface TrainingData {
  prospectId: string;
  features: FeatureVector;
  converted: boolean; // Target variable
  dealValue?: number;
}

export interface FeatureVector {
  // Industry risk (0-100)
  industryRisk: number;

  // Compliance metrics (0-100)
  complianceScore: number;
  violationCount: number;

  // Business metrics
  employeeCount: number;
  revenueCategory: number; // 1-5 scale
  foundedYear: number;

  // Website metrics
  websiteAge: number;
  hasHttps: boolean; // 0 or 1
  mobileResponsive: boolean; // 0 or 1
  pageLoadTime: number; // milliseconds

  // Engagement metrics
  emailOpens: number;
  emailClicks: number;
  outreachAttempts: number;

  // Risk factors
  redFlagCount: number;
  lawsuitsInMetro: number; // Lawsuits filed in their metro (last 12 months)
}

export interface PredictionResult {
  conversionProbability: number; // 0-1
  confidenceScore: number; // 0-1
  recommendedAction: 'call' | 'email' | 'nurture' | 'skip';
  estimatedDealValue: number;
  topFeatures: Array<{ feature: string; impact: number }>;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
}

export class MLScoringService {
  /**
   * Extract features from prospect
   */
  static async extractFeatures(prospectId: string): Promise<FeatureVector> {
    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
      include: {
        audit: true,
        industry: true,
        metro: true,
        outreachEmails: true,
        personalizedEmails: true,
      },
    });

    if (!prospect) {
      throw new Error('Prospect not found');
    }

    // Count lawsuits in metro (last 12 months)
    const lawsuitsInMetro = await prisma.lawsuit.count({
      where: {
        metroId: prospect.metroId,
        filedDate: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Calculate email engagement
    const emailOpens = prospect.personalizedEmails.filter(e => e.opened).length;
    const emailClicks = prospect.personalizedEmails.filter(e => e.clicked).length;

    return {
      industryRisk: this.getIndustryRiskScore(prospect.industry),
      complianceScore: prospect.complianceScore,
      violationCount: prospect.violationCount,
      employeeCount: prospect.employeeCount || 10,
      revenueCategory: this.categorizeRevenue(prospect.revenue),
      foundedYear: prospect.foundedYear || 2000,
      websiteAge: prospect.websiteLastUpdated
        ? (Date.now() - prospect.websiteLastUpdated.getTime()) / (365 * 24 * 60 * 60 * 1000)
        : 5,
      hasHttps: prospect.audit?.hasHttps ? 1 : 0,
      mobileResponsive: prospect.audit?.mobileResponsive ? 1 : 0,
      pageLoadTime: prospect.audit?.pageLoadTime || 3000,
      emailOpens,
      emailClicks,
      outreachAttempts: prospect.emailsSent,
      redFlagCount: prospect.redFlags.length,
      lawsuitsInMetro,
    };
  }

  /**
   * Train new ML model
   */
  static async trainModel(params: {
    name: string;
    algorithm: 'logistic_regression' | 'random_forest' | 'xgboost';
  }): Promise<{
    modelId: string;
    metrics: ModelMetrics;
  }> {
    const startTime = Date.now();

    log.info('Starting model training', params);

    // Gather training data
    const trainingData = await this.gatherTrainingData();

    if (trainingData.length < 50) {
      throw new Error('Insufficient training data (minimum 50 records required)');
    }

    log.info('Training data gathered', { count: trainingData.length });

    // Split train/test (80/20)
    const splitIndex = Math.floor(trainingData.length * 0.8);
    const trainSet = trainingData.slice(0, splitIndex);
    const testSet = trainingData.slice(splitIndex);

    // Train simple logistic regression (MVP implementation)
    const weights = this.trainLogisticRegression(trainSet);

    // Evaluate on test set
    const metrics = this.evaluateModel(weights, testSet);

    // Calculate feature importance
    const featureImportance = this.calculateFeatureImportance(weights);

    // Save model
    const model = await prisma.mLModel.create({
      data: {
        name: params.name,
        version: `v${Date.now()}`,
        algorithm: params.algorithm,
        targetVariable: 'conversion_probability',
        trainingDataSize: trainingData.length,
        trainingStartedAt: new Date(startTime),
        trainingCompletedAt: new Date(),
        trainingDurationSec: Math.floor((Date.now() - startTime) / 1000),
        accuracy: metrics.accuracy,
        precision: metrics.precision,
        recall: metrics.recall,
        f1Score: metrics.f1Score,
        auc: metrics.auc,
        featureImportance,
        modelPath: null, // TODO: Save to S3
        isActive: false, // Manual activation required
      },
    });

    log.info('Model training complete', {
      modelId: model.id,
      metrics,
      duration: Math.floor((Date.now() - startTime) / 1000),
    });

    return {
      modelId: model.id,
      metrics,
    };
  }

  /**
   * Predict conversion probability for prospect
   */
  static async predictConversion(prospectId: string): Promise<PredictionResult> {
    // Get active model
    const model = await prisma.mLModel.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!model) {
      // Fallback to rule-based scoring
      return this.ruleBasedPrediction(prospectId);
    }

    // Extract features
    const features = await this.extractFeatures(prospectId);

    // Get model weights
    const weights = model.featureImportance as any; // Stored as JSON

    // Calculate probability
    const probability = this.sigmoid(this.dotProduct(features, weights));

    // Calculate confidence (based on feature quality)
    const confidence = this.calculateConfidence(features);

    // Determine action
    const action = this.determineAction(probability, confidence);

    // Estimate deal value
    const estimatedValue = this.estimateDealValue(features, probability);

    // Get top contributing features
    const topFeatures = this.getTopFeatures(features, weights);

    // Save prediction
    await prisma.mLPrediction.create({
      data: {
        prospectId,
        modelId: model.id,
        conversionProbability: probability,
        confidenceScore: confidence,
        recommendedAction: action,
        estimatedDealValue: estimatedValue,
        featureValues: features as any,
        topFeatures: topFeatures as any,
      },
    });

    return {
      conversionProbability: probability,
      confidenceScore: confidence,
      recommendedAction: action,
      estimatedDealValue: estimatedValue,
      topFeatures,
    };
  }

  /**
   * Gather training data from historical conversions
   */
  private static async gatherTrainingData(): Promise<TrainingData[]> {
    const prospects = await prisma.prospect.findMany({
      where: {
        responseStatus: {
          in: ['converted', 'not_interested', 'no_response'],
        },
      },
      include: {
        audit: true,
        industry: true,
        metro: true,
        outreachEmails: true,
        personalizedEmails: true,
      },
      take: 1000, // Last 1000 prospects with outcomes
    });

    const trainingData: TrainingData[] = [];

    for (const prospect of prospects) {
      try {
        const features = await this.extractFeatures(prospect.id);

        trainingData.push({
          prospectId: prospect.id,
          features,
          converted: prospect.responseStatus === 'converted',
          dealValue: prospect.responseStatus === 'converted' ? 5000 : undefined, // Placeholder
        });
      } catch (error) {
        log.error('Failed to extract features for training', { prospectId: prospect.id, error });
      }
    }

    return trainingData;
  }

  /**
   * Train simple logistic regression (MVP)
   */
  private static trainLogisticRegression(data: TrainingData[]): Record<string, number> {
    // Initialize weights (one per feature)
    const weights: Record<string, number> = {
      industryRisk: 0,
      complianceScore: 0,
      violationCount: 0,
      employeeCount: 0,
      revenueCategory: 0,
      foundedYear: 0,
      websiteAge: 0,
      hasHttps: 0,
      mobileResponsive: 0,
      pageLoadTime: 0,
      emailOpens: 0,
      emailClicks: 0,
      outreachAttempts: 0,
      redFlagCount: 0,
      lawsuitsInMetro: 0,
    };

    // Simple gradient descent (100 iterations)
    const learningRate = 0.01;
    const iterations = 100;

    for (let iter = 0; iter < iterations; iter++) {
      for (const sample of data) {
        const prediction = this.sigmoid(this.dotProduct(sample.features, weights));
        const error = prediction - (sample.converted ? 1 : 0);

        // Update weights
        for (const [feature, value] of Object.entries(sample.features)) {
          weights[feature] -= learningRate * error * (value as number);
        }
      }
    }

    return weights;
  }

  /**
   * Evaluate model performance
   */
  private static evaluateModel(weights: Record<string, number>, testData: TrainingData[]): ModelMetrics {
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;

    for (const sample of testData) {
      const probability = this.sigmoid(this.dotProduct(sample.features, weights));
      const predicted = probability >= 0.5;
      const actual = sample.converted;

      if (predicted && actual) truePositives++;
      else if (predicted && !actual) falsePositives++;
      else if (!predicted && !actual) trueNegatives++;
      else if (!predicted && actual) falseNegatives++;
    }

    const accuracy = (truePositives + trueNegatives) / testData.length;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = (2 * precision * recall) / (precision + recall) || 0;

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      auc: accuracy, // Simplified for MVP
    };
  }

  /**
   * Calculate feature importance
   */
  private static calculateFeatureImportance(weights: Record<string, number>): Record<string, number> {
    const importance: Record<string, number> = {};
    const total = Object.values(weights).reduce((sum, w) => sum + Math.abs(w), 0);

    for (const [feature, weight] of Object.entries(weights)) {
      importance[feature] = Math.abs(weight) / total;
    }

    return importance;
  }

  /**
   * Sigmoid activation function
   */
  private static sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Dot product of features and weights
   */
  private static dotProduct(features: FeatureVector, weights: Record<string, number>): number {
    let sum = 0;

    for (const [feature, value] of Object.entries(features)) {
      sum += (value as number) * (weights[feature] || 0);
    }

    return sum;
  }

  /**
   * Calculate confidence score
   */
  private static calculateConfidence(features: FeatureVector): number {
    let score = 0.5; // Base

    // More confidence if we have good data
    if (features.emailOpens > 0) score += 0.1;
    if (features.emailClicks > 0) score += 0.15;
    if (features.employeeCount > 0) score += 0.1;
    if (features.hasHttps) score += 0.05;
    if (features.lawsuitsInMetro > 0) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Determine recommended action
   */
  private static determineAction(
    probability: number,
    confidence: number
  ): 'call' | 'email' | 'nurture' | 'skip' {
    if (probability >= 0.7 && confidence >= 0.7) return 'call';
    if (probability >= 0.5) return 'email';
    if (probability >= 0.3) return 'nurture';
    return 'skip';
  }

  /**
   * Estimate deal value
   */
  private static estimateDealValue(features: FeatureVector, probability: number): number {
    // Base value
    let value = 5000;

    // Adjust by company size
    value += features.employeeCount * 50;

    // Adjust by revenue category
    value += features.revenueCategory * 1000;

    // Adjust by probability
    value *= probability;

    return Math.round(value);
  }

  /**
   * Get top contributing features
   */
  private static getTopFeatures(
    features: FeatureVector,
    weights: Record<string, number>
  ): Array<{ feature: string; impact: number }> {
    const impacts: Array<{ feature: string; impact: number }> = [];

    for (const [feature, value] of Object.entries(features)) {
      const impact = (value as number) * (weights[feature] || 0);
      impacts.push({ feature, impact: Math.abs(impact) });
    }

    return impacts.sort((a, b) => b.impact - a.impact).slice(0, 5);
  }

  /**
   * Rule-based prediction (fallback if no model)
   */
  private static async ruleBasedPrediction(prospectId: string): Promise<PredictionResult> {
    const features = await this.extractFeatures(prospectId);

    // Simple heuristic
    let probability = 0.5;

    if (features.industryRisk > 70) probability += 0.15;
    if (features.complianceScore < 50) probability += 0.1;
    if (features.emailOpens > 0) probability += 0.1;
    if (features.emailClicks > 0) probability += 0.15;

    probability = Math.min(probability, 1.0);

    return {
      conversionProbability: probability,
      confidenceScore: 0.5,
      recommendedAction: probability >= 0.6 ? 'email' : 'nurture',
      estimatedDealValue: this.estimateDealValue(features, probability),
      topFeatures: [],
    };
  }

  /**
   * Helper methods
   */
  private static getIndustryRiskScore(industry: any): number {
    if (!industry) return 50;

    const riskMap: Record<string, number> = {
      critical: 90,
      high: 75,
      medium: 50,
      low: 25,
    };

    return riskMap[industry.adaRiskLevel] || 50;
  }

  private static categorizeRevenue(revenue: string | null): number {
    if (!revenue) return 1;

    if (revenue.includes('$50M')) return 5;
    if (revenue.includes('$10M')) return 4;
    if (revenue.includes('$5M')) return 3;
    if (revenue.includes('$1M')) return 2;
    return 1;
  }

  /**
   * Activate model for production use
   */
  static async activateModel(modelId: string): Promise<void> {
    // Deactivate all other models
    await prisma.mLModel.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Activate this model
    await prisma.mLModel.update({
      where: { id: modelId },
      data: {
        isActive: true,
        deployedAt: new Date(),
      },
    });

    log.info('Model activated', { modelId });
  }

  /**
   * Get model performance metrics
   */
  static async getModelMetrics(modelId: string): Promise<ModelMetrics | null> {
    const model = await prisma.mLModel.findUnique({
      where: { id: modelId },
    });

    if (!model) return null;

    return {
      accuracy: model.accuracy || 0,
      precision: model.precision || 0,
      recall: model.recall || 0,
      f1Score: model.f1Score || 0,
      auc: model.auc || 0,
    };
  }
}
