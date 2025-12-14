import React, { Component, useState, useEffect, ErrorInfo, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './src/components/Layout';
import AuthPage from './src/pages/AuthPage';
import DashboardPage from './src/pages/DashboardPage';
import DealDetailsPage from './src/pages/DealDetailsPage';
import SettingsPage from './src/pages/SettingsPage';
import ReportsPage from './src/pages/ReportsPage';
import DocumentsPage from './src/pages/DocumentsPage';
import CommunicationsPage from './src/pages/CommunicationsPage';
import LeadGenPage from './src/pages/LeadGenPage';
import AdminDashboardPage from './src/pages/AdminDashboardPage';
import MortgageCalculatorPage from './src/pages/MortgageCalculatorPage';
import ContactsPage from './src/pages/ContactsPage';
import DealModal from './src/components/DealModal';
import AiChatModal from './src/components/AiChatModal';
import ConfirmModal from './src/components/ConfirmModal';
import { Deal, LeadGenLog, UserAccount, DocumentFile, Contact, ContactInteraction } from './src/types';
import { api } from './src/services/firestore';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold text-slate-