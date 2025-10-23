"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

interface OllamaStatusData {
  current_model: string;
  model_available: boolean;
  signin_required: boolean;
  signin_url: string | null;
  available_models: string[];
}

export default function OllamaStatus() {
  const [status, setStatus] = useState<OllamaStatusData | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showSigninModal, setShowSigninModal] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto-show modal when signin is required
    if (status?.signin_required && status?.signin_url && !restarting) {
      setShowSigninModal(true);
    }
  }, [status, restarting]);

  const fetchStatus = async () => {
    try {
      const response = await axios.get<OllamaStatusData>(`${API_URL}/api/ollama/status`);
      setStatus(response.data);
    } catch (err) {
      console.error("Failed to fetch Ollama status:", err);
    }
  };

  const handleRestart = async () => {
    if (restarting) return;

    setRestarting(true);
    setShowTooltip(false);
    try {
      // Run 'ollama signin' command to get signin URL
      const response = await axios.post(`${API_URL}/api/ollama/signin`);
      const signinUrl = response.data.signin_url;

      // Automatically open browser to signin URL
      if (signinUrl) {
        window.open(signinUrl, '_blank');
      }

      // Refresh status after signin
      await fetchStatus();

      setRestarting(false);
    } catch (err) {
      console.error("Failed to initiate signin:", err);
      setRestarting(false);
    }
  };

  const handleSignin = async () => {
    try {
      // Run 'ollama signin' command to get signin URL
      const response = await axios.post(`${API_URL}/api/ollama/signin`);
      const signinUrl = response.data.signin_url;

      if (signinUrl) {
        window.open(signinUrl, '_blank');
      }

      setShowSigninModal(false);
    } catch (err) {
      console.error("Failed to get signin URL:", err);
      // Fallback to existing signin_url if available
      if (status?.signin_url) {
        window.open(status.signin_url, '_blank');
        setShowSigninModal(false);
      }
    }
  };

  const handleCloseModal = () => {
    setShowSigninModal(false);
  };

  if (!status) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center animate-pulse shadow-lg">
          <svg className="w-5 h-5 text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  const getStatusColor = () => {
    if (restarting) return "bg-gray-500";
    if (status.signin_required) return "bg-yellow-500";
    if (!status.model_available) return "bg-red-500";
    return "bg-green-500";
  };

  const getStatusIcon = () => {
    if (restarting) {
      return (
        <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    if (status.signin_required) {
      return (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    }
    if (!status.model_available) {
      return (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <>
      {/* Signin Modal */}
      {showSigninModal && status?.signin_url && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-[#1a1a1a] border border-[rgba(255,255,255,0.14)] rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-[18px] font-semibold mb-2">Ollama Authentication Required</h3>
                <p className="text-[14px] text-muted mb-4">
                  Please sign in to Ollama Cloud to continue using AI-powered resume processing.
                </p>
                <p className="text-[13px] text-muted">
                  Model: <span className="text-white font-medium">{status.current_model}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSignin}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                Sign in to Ollama
              </button>
              <button
                onClick={handleCloseModal}
                className="px-4 py-2.5 border border-[rgba(255,255,255,0.14)] hover:border-[rgba(255,255,255,0.24)] rounded-lg transition-colors text-[14px]"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Icon */}
      <div
        className="fixed bottom-4 right-4 z-50 cursor-pointer"
        onClick={handleRestart}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="relative">
          <div className={`w-10 h-10 rounded-full ${getStatusColor()} hover:opacity-80 flex items-center justify-center transition-all shadow-lg`}>
            {getStatusIcon()}
          </div>
          {showTooltip && (
            <div className="absolute bottom-12 right-0 bg-gray-800 text-white px-3 py-2 rounded-lg text-[12px] whitespace-nowrap shadow-lg">
              <div className="mb-1 font-medium">{status.current_model}</div>
              {status.signin_required && (
                <div className="text-yellow-300 text-[11px]">⚠ Authentication required</div>
              )}
              {!status.signin_required && status.model_available && (
                <div className="text-green-300 text-[11px]">✓ Ready</div>
              )}
              {!status.model_available && !status.signin_required && (
                <div className="text-red-300 text-[11px]">⚠ Model not available</div>
              )}
              {restarting ? (
                <div className="mt-1 text-gray-400 text-[10px]">Getting signin URL...</div>
              ) : (
                <div className="mt-1 text-gray-400 text-[10px]">Click to sign in</div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
