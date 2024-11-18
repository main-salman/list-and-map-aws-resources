'use client'
import { useState } from 'react';
import { Report } from '../types';

export default function WhistleblowerForm() {
  const [issue, setIssue] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [similarReports, setSimilarReports] = useState<number>(0);
  const [showConnectInfo, setShowConnectInfo] = useState(false);
  const [relatedEmails, setRelatedEmails] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issue,
          company,
          email: email || null, // Make email optional
          department,
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      setSimilarReports(data.similarReports);
      setRelatedEmails(data.relatedEmails || []);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-green-600 mb-4">Report Submitted Successfully</h2>
        <p className="mb-4">Thank you for your report. Your voice matters.</p>
        
        {similarReports > 0 && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800">
              There {similarReports === 1 ? 'is' : 'are'} {similarReports} other {similarReports === 1 ? 'person' : 'people'} who 
              reported a similar issue at {company}.
            </p>
            
            {email && !showConnectInfo && (
              <button
                onClick={() => setShowConnectInfo(true)}
                className="mt-2 text-blue-600 underline hover:text-blue-800"
              >
                Connect with others who provided contact information
              </button>
            )}

            {showConnectInfo && relatedEmails.length > 0 && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                <p className="mb-2 font-semibold">Contact information for others who reported this issue:</p>
                <ul className="list-disc pl-5">
                  {relatedEmails.map((email, index) => (
                    <li key={index}>{email}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Anonymous Whistleblower Report
          </h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <input
                type="text"
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department (Optional)
              </label>
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Issue Description
              </label>
              <textarea
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-32"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="Describe the issue in detail..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contact Email (Optional)
              </label>
              <input
                type="email"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">
                Only provide email if you want to connect with other whistleblowers
              </p>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Submit Report
            </button>
          </form>

          <div className="mt-8 text-sm text-gray-500">
            <p>Your privacy and security are our top priority:</p>
            <ul className="list-disc pl-5 mt-2">
              <li>All submissions are encrypted</li>
              <li>IP addresses are not logged</li>
              <li>Email addresses are optional and only used for connecting with other whistleblowers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 