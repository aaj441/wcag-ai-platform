/**
 * WCAGAI Review Dashboard
 *
 * Two-column consultant workflow for reviewing and approving audits
 */

import React, { useState, useEffect } from "react";

interface ReviewDashboardProps {
  scanId?: string;
}

export function ReviewDashboard({ scanId }: ReviewDashboardProps) {
  const [scans, setScans] = useState<any[]>([]);
  const [selectedScan, setSelectedScan] = useState<string | null>(scanId || null);
  const [loading, setLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState("pending");
  const [reviewNotes, setReviewNotes] = useState("");
  const [consultantEmail, setConsultantEmail] = useState("");

  const selectedScanData = scans.find((s) => s.id === selectedScan);

  useEffect(() => {
    fetchPendingScans();
  }, []);

  async function fetchPendingScans() {
    try {
      setLoading(true);
      const response = await fetch("/api/consultant/scans/pending");
      const data = await response.json();
      setScans(data.data || []);
    } catch (error) {
      console.error("Failed to fetch scans:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!selectedScan || !consultantEmail) {
      alert("Please select a scan and enter your email");
      return;
    }

    try {
      const response = await fetch(`/api/consultant/scans/${selectedScan}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalStatus,
          consultantEmail,
          notes: reviewNotes,
        }),
      });

      if (response.ok) {
        alert("Scan approved successfully");
        await fetchPendingScans();
        setSelectedScan(null);
        setReviewNotes("");
        setApprovalStatus("pending");
      } else {
        alert("Failed to approve scan");
      }
    } catch (error) {
      console.error("Approval failed:", error);
      alert("Error approving scan");
    }
  }

  if (loading && scans.length === 0) {
    return <div className="p-8">Loading scans...</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-8 p-8 h-screen bg-gray-50">
      {/* Left Column: Scans List */}
      <div className="flex flex-col gap-4 overflow-hidden border-r">
        <div>
          <h1 className="text-2xl font-bold mb-4">Pending Reviews</h1>
          <p className="text-sm text-gray-600 mb-4">
            {scans.length} scans awaiting review
          </p>
        </div>

        <div className="overflow-y-auto flex-1 space-y-2">
          {scans.map((scan) => (
            <div
              key={scan.id}
              onClick={() => setSelectedScan(scan.id)}
              className={`p-4 rounded-lg cursor-pointer transition border-2 ${
                selectedScan === scan.id
                  ? "bg-blue-50 border-blue-500"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-mono text-sm text-gray-600 truncate">
                {scan.websiteUrl}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  scan.aiConfidenceScore >= 0.9
                    ? "bg-green-100 text-green-800"
                    : scan.aiConfidenceScore >= 0.7
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}>
                  {(scan.aiConfidenceScore * 100).toFixed(0)}% Confidence
                </span>
                <span className="text-xs text-gray-500">
                  {scan.violations?.length || 0} issues
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Detailed Review */}
      {selectedScanData ? (
        <div className="flex flex-col gap-4 overflow-hidden">
          <div>
            <h2 className="text-xl font-bold mb-2">Review Scan</h2>
            <p className="text-sm text-gray-600">{selectedScanData.websiteUrl}</p>
          </div>

          {/* Violations List */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            <h3 className="font-bold text-lg">Violations</h3>
            {(selectedScanData.violations || [])
              .sort((a: any, b: any) => (b.aiConfidence || 0) - (a.aiConfidence || 0))
              .map((v: any) => (
                <div key={v.id} className="bg-white p-3 rounded border">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-sm">WCAG {v.wcagCriteria}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {v.description}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ml-2 ${
                      v.severity === "critical"
                        ? "bg-red-100 text-red-800"
                        : v.severity === "high"
                          ? "bg-orange-100 text-orange-800"
                          : v.severity === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                    }`}>
                      {v.severity}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Confidence: {((v.aiConfidence || 0) * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
          </div>

          {/* Review Form */}
          <div className="space-y-3 bg-white p-4 rounded border">
            <div>
              <label className="block text-sm font-bold mb-1">Your Email</label>
              <input
                type="email"
                value={consultantEmail}
                onChange={(e) => setConsultantEmail(e.target.value)}
                placeholder="consultant@wcagai.com"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Decision</label>
              <select
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="pending">Pending</option>
                <option value="approved">Approve</option>
                <option value="disputed">Dispute</option>
                <option value="rejected">Reject</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-1">Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add review notes..."
                rows={4}
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <button
              onClick={handleApprove}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700"
            >
              {approvalStatus === "approved"
                ? "Approve & Generate Report"
                : approvalStatus === "disputed"
                  ? "Mark as Disputed"
                  : "Reject"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center bg-white rounded border-2 border-dashed border-gray-300">
          <p className="text-gray-500">Select a scan to review</p>
        </div>
      )}
    </div>
  );
}
