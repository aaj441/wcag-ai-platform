import { Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response): void => {
  const error = {
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    availableRoutes: getAvailableRoutes(),
  };

  if (process.env.NODE_ENV === 'development') {
    error.debug = {
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: req.headers,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
    };
  }

  res.status(404).json(error);
};

function getAvailableRoutes(): string[] {
  // This would typically be populated from your route definitions
  // For now, return the known routes
  return [
    'GET /health',
    'GET /api/v1/auth/login',
    'POST /api/v1/auth/register',
    'POST /api/v1/auth/logout',
    'POST /api/v1/auth/refresh',
    'POST /api/v1/auth/forgot-password',
    'POST /api/v1/auth/reset-password',
    'GET /api/v1/users/profile',
    'PUT /api/v1/users/profile',
    'POST /api/v1/scans',
    'GET /api/v1/scans',
    'GET /api/v1/scans/:id',
    'DELETE /api/v1/scans/:id',
    'GET /api/v1/reports',
    'GET /api/v1/reports/:id',
    'POST /api/v1/reports/:id/download',
    'GET /api/v1/organizations',
    'POST /api/v1/organizations',
    'GET /api/v1/organizations/:id',
    'PUT /api/v1/organizations/:id',
    'DELETE /api/v1/organizations/:id',
    'GET /api/v1/projects',
    'POST /api/v1/projects',
    'GET /api/v1/projects/:id',
    'PUT /api/v1/projects/:id',
    'DELETE /api/v1/projects/:id',
    'GET /api/v1/audit/logs',
  ];
}

// Enhanced 404 handler with suggestions
export const notFoundHandlerWithSuggestions = (req: Request, res: Response): void => {
  const path = req.path.toLowerCase();
  const method = req.method.toUpperCase();
  
  // Try to find similar routes
  const suggestions = findSimilarRoutes(method, path);
  
  const error = {
    success: false,
    message: `Route ${method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    suggestions: suggestions.length > 0 ? suggestions : undefined,
    didYouMean: suggestions.length > 0 ? suggestions[0] : undefined,
  };

  if (process.env.NODE_ENV === 'development') {
    error.debug = {
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: req.headers,
      availableRoutes: getAvailableRoutes(),
    };
  }

  res.status(404).json(error);
};

function findSimilarRoutes(method: string, path: string): string[] {
  const availableRoutes = [
    { method: 'GET', path: '/api/v1/scans' },
    { method: 'POST', path: '/api/v1/scans' },
    { method: 'GET', path: '/api/v1/scans/:id' },
    { method: 'GET', path: '/api/v1/reports' },
    { method: 'GET', path: '/api/v1/reports/:id' },
    { method: 'GET', path: '/api/v1/users/profile' },
    { method: 'PUT', path: '/api/v1/users/profile' },
    { method: 'GET', path: '/api/v1/organizations' },
    { method: 'POST', path: '/api/v1/organizations' },
    { method: 'GET', path: '/api/v1/organizations/:id' },
    { method: 'GET', path: '/api/v1/projects' },
    { method: 'POST', path: '/api/v1/projects' },
    { method: 'GET', path: '/api/v1/projects/:id' },
  ];

  // Find routes with similar paths
  const similarRoutes = availableRoutes
    .filter(route => {
      // Same method or allow GET for POST (common for list vs create)
      const methodMatch = route.method === method || (method === 'POST' && route.method === 'GET');
      
      // Calculate path similarity
      const pathSegments = path.split('/').filter(Boolean);
      const routeSegments = route.path.split('/').filter(Boolean);
      
      // Check if segments match or if it's a parameter route
      let segmentMatches = 0;
      const minLength = Math.min(pathSegments.length, routeSegments.length);
      
      for (let i = 0; i < minLength; i++) {
        if (pathSegments[i] === routeSegments[i] || routeSegments[i].startsWith(':')) {
          segmentMatches++;
        }
      }
      
      // Consider it similar if at least half of the segments match
      return methodMatch && segmentMatches >= Math.ceil(routeSegments.length / 2);
    })
    .map(route => `${route.method} ${route.path}`)
    .slice(0, 3); // Limit suggestions to 3

  return similarRoutes;
}

// API version mismatch handler
export const apiVersionHandler = (req: Request, res: Response, next: Function): void => {
  const supportedVersions = ['v1'];
  const pathSegments = req.path.split('/').filter(Boolean);
  
  if (pathSegments.length >= 2 && pathSegments[0] === 'api') {
    const requestedVersion = pathSegments[1];
    
    if (!supportedVersions.includes(requestedVersion)) {
      res.status(400).json({
        success: false,
        message: `API version ${requestedVersion} is not supported`,
        code: 'UNSUPPORTED_API_VERSION',
        timestamp: new Date().toISOString(),
        supportedVersions,
        currentVersion: supportedVersions[0],
        suggestions: [
          `Try using /api/${supportedVersions[0]}/${pathSegments.slice(2).join('/')}`,
        ],
      });
      return;
    }
  }
  
  next();
};