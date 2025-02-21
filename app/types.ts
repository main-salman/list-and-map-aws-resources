export interface Report {
  id?: string;
  company: string;
  department?: string;
  issue: string;
  email?: string | null;
  timestamp: string;
}

interface AWSResource {
  type: string;
  serviceType: string;
  name: string;
  id: string;
  region: string;
  url: string;
  relationships?: {
    securityGroups?: string[];
    targetGroups?: string[];
    loadBalancer?: string;
    dnsRecords?: string[];
    certificate?: string;
    instances?: string[];
    volumes?: string[];
    cloudfront?: string;
    repository?: string;  // For ECR repository
  };
} 