#!/usr/bin/env python3
"""
Insurance Lead Import - HIPAA-Compliant Lead Management
WCAG AI Platform - Health Insurance Module

This script imports and processes health insurance leads with HIPAA-compliant
data handling, encryption, and audit logging.

Usage:
    python insurance_lead_import.py --source facebook --date 2025-11-14
    python insurance_lead_import.py --source csv --file leads.csv
    python insurance_lead_import.py --source api --batch-id 12345

Requirements:
    pip install boto3 cryptography pandas psycopg2-binary requests
"""

import os
import json
import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import argparse

# External dependencies (install with pip)
try:
    import boto3
    import pandas as pd
    import psycopg2
    from cryptography.fernet import Fernet
    import requests
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install boto3 cryptography pandas psycopg2-binary requests")
    exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/tmp/insurance_lead_import.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Constants
ENCRYPTION_KEY = os.getenv('HIPAA_ENCRYPTION_KEY', Fernet.generate_key())
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://localhost/wcag_platform')
S3_BUCKET = os.getenv('INSURANCE_LEADS_BUCKET', 'wcag-insurance-leads')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

@dataclass
class InsuranceLead:
    """Insurance lead data structure with HIPAA-sensitive fields"""
    lead_id: str
    source: str  # facebook, google, referral, aged_lead
    first_name: str
    last_name: str
    email: str
    phone: str
    date_of_birth: Optional[str] = None  # HIPAA Protected
    zip_code: Optional[str] = None
    state: Optional[str] = None
    coverage_type: Optional[str] = None  # medicare, aca, supplement, final_expense
    household_income: Optional[str] = None  # HIPAA Protected
    health_conditions: Optional[str] = None  # HIPAA Protected
    current_coverage: Optional[bool] = None
    preferred_contact_time: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = datetime.now(timezone.utc).isoformat()
    imported_at: str = datetime.now(timezone.utc).isoformat()
    consent_given: bool = False
    tcpa_compliant: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return asdict(self)
    
    def get_hipaa_fields(self) -> List[str]:
        """Get list of HIPAA-protected fields"""
        return [
            'date_of_birth',
            'household_income',
            'health_conditions',
            'phone',
            'email'
        ]


class HIPAACompliantEncryption:
    """HIPAA-compliant encryption for sensitive data"""
    
    def __init__(self, key: bytes = ENCRYPTION_KEY):
        if isinstance(key, str):
            key = key.encode()
        self.cipher = Fernet(key)
        logger.info("Initialized HIPAA encryption")
    
    def encrypt(self, data: str) -> str:
        """Encrypt sensitive data"""
        if not data:
            return ""
        return self.cipher.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        if not encrypted_data:
            return ""
        return self.cipher.decrypt(encrypted_data.encode()).decode()
    
    def hash_pii(self, data: str) -> str:
        """Create one-way hash for PII (for deduplication)"""
        return hashlib.sha256(data.encode()).hexdigest()


class AuditLogger:
    """Compliance audit logger for insurance lead processing"""
    
    def __init__(self):
        self.log_file = '/tmp/insurance_lead_audit.jsonl'
        logger.info(f"Audit logging to {self.log_file}")
    
    def log_event(self, event_type: str, lead_id: str, details: Dict[str, Any]):
        """Log compliance event"""
        event = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': event_type,
            'lead_id': lead_id,
            'details': details,
            'user': os.getenv('USER', 'system'),
            'ip_address': self._get_ip_address()
        }
        
        with open(self.log_file, 'a') as f:
            f.write(json.dumps(event) + '\n')
        
        logger.info(f"Audit: {event_type} for lead {lead_id}")
    
    def _get_ip_address(self) -> str:
        """Get current IP address for audit trail"""
        try:
            return requests.get('https://api.ipify.org', timeout=2).text
        except:
            return 'unknown'


class LeadImporter:
    """Main lead import orchestrator"""
    
    def __init__(self):
        self.encryption = HIPAACompliantEncryption()
        self.audit = AuditLogger()
        self.s3_client = boto3.client('s3', region_name=AWS_REGION)
        logger.info("Initialized LeadImporter")
    
    def import_from_facebook(self, date: str) -> List[InsuranceLead]:
        """Import leads from Facebook Lead Ads"""
        logger.info(f"Importing Facebook leads for date: {date}")
        
        # Facebook Graph API integration
        access_token = os.getenv('FACEBOOK_LEADS_ACCESS_TOKEN')
        page_id = os.getenv('FACEBOOK_LEADS_PAGE_ID')
        
        if not access_token or not page_id:
            logger.error("Missing Facebook API credentials")
            return []
        
        # Fetch leads from Facebook API
        url = f"https://graph.facebook.com/v18.0/{page_id}/leadgen_forms"
        headers = {'Authorization': f'Bearer {access_token}'}
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            fb_data = response.json()
            
            leads = self._parse_facebook_leads(fb_data)
            logger.info(f"Imported {len(leads)} leads from Facebook")
            return leads
            
        except Exception as e:
            logger.error(f"Facebook import failed: {e}")
            return []
    
    def import_from_csv(self, file_path: str) -> List[InsuranceLead]:
        """Import leads from CSV file"""
        logger.info(f"Importing leads from CSV: {file_path}")
        
        try:
            df = pd.read_csv(file_path)
            leads = []
            
            for _, row in df.iterrows():
                lead = InsuranceLead(
                    lead_id=str(row.get('lead_id', self._generate_lead_id())),
                    source='csv',
                    first_name=row['first_name'],
                    last_name=row['last_name'],
                    email=row['email'],
                    phone=row['phone'],
                    date_of_birth=row.get('dob'),
                    zip_code=row.get('zip'),
                    state=row.get('state'),
                    coverage_type=row.get('coverage_type'),
                    notes=row.get('notes'),
                    consent_given=bool(row.get('consent', False)),
                    tcpa_compliant=bool(row.get('tcpa_consent', False))
                )
                leads.append(lead)
            
            logger.info(f"Parsed {len(leads)} leads from CSV")
            return leads
            
        except Exception as e:
            logger.error(f"CSV import failed: {e}")
            return []
    
    def import_from_api(self, batch_id: str) -> List[InsuranceLead]:
        """Import leads from third-party aged lead provider API"""
        logger.info(f"Importing leads from API, batch: {batch_id}")
        
        api_key = os.getenv('AGED_LEADS_API_KEY')
        api_url = os.getenv('AGED_LEADS_API_URL', 'https://api.agedleads.com/v1')
        
        if not api_key:
            logger.error("Missing aged leads API key")
            return []
        
        try:
            url = f"{api_url}/batches/{batch_id}/leads"
            headers = {'Authorization': f'Bearer {api_key}'}
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            api_data = response.json()
            leads = self._parse_api_leads(api_data)
            logger.info(f"Imported {len(leads)} leads from API")
            return leads
            
        except Exception as e:
            logger.error(f"API import failed: {e}")
            return []
    
    def process_leads(self, leads: List[InsuranceLead]) -> int:
        """Process and store leads with encryption and audit logging"""
        logger.info(f"Processing {len(leads)} leads")
        processed_count = 0
        
        for lead in leads:
            try:
                # Validate consent
                if not lead.consent_given or not lead.tcpa_compliant:
                    logger.warning(f"Skipping lead {lead.lead_id}: missing consent")
                    self.audit.log_event(
                        'lead_rejected',
                        lead.lead_id,
                        {'reason': 'missing_consent'}
                    )
                    continue
                
                # Encrypt HIPAA-protected fields
                encrypted_lead = self._encrypt_lead(lead)
                
                # Store in database
                self._store_lead(encrypted_lead)
                
                # Archive to S3
                self._archive_to_s3(encrypted_lead)
                
                # Audit log
                self.audit.log_event(
                    'lead_imported',
                    lead.lead_id,
                    {
                        'source': lead.source,
                        'coverage_type': lead.coverage_type,
                        'encrypted': True
                    }
                )
                
                processed_count += 1
                
            except Exception as e:
                logger.error(f"Failed to process lead {lead.lead_id}: {e}")
                self.audit.log_event(
                    'lead_import_failed',
                    lead.lead_id,
                    {'error': str(e)}
                )
        
        logger.info(f"Successfully processed {processed_count}/{len(leads)} leads")
        return processed_count
    
    def _encrypt_lead(self, lead: InsuranceLead) -> InsuranceLead:
        """Encrypt HIPAA-protected fields"""
        encrypted_lead = InsuranceLead(**lead.to_dict())
        
        for field in lead.get_hipaa_fields():
            value = getattr(encrypted_lead, field)
            if value:
                encrypted_value = self.encryption.encrypt(str(value))
                setattr(encrypted_lead, field, encrypted_value)
        
        return encrypted_lead
    
    def _store_lead(self, lead: InsuranceLead):
        """Store lead in PostgreSQL database"""
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        try:
            # Create table if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS insurance_leads (
                    lead_id VARCHAR(255) PRIMARY KEY,
                    source VARCHAR(50),
                    first_name VARCHAR(255),
                    last_name VARCHAR(255),
                    email TEXT,  -- Encrypted
                    phone TEXT,  -- Encrypted
                    date_of_birth TEXT,  -- Encrypted
                    zip_code VARCHAR(10),
                    state VARCHAR(2),
                    coverage_type VARCHAR(50),
                    household_income TEXT,  -- Encrypted
                    health_conditions TEXT,  -- Encrypted
                    current_coverage BOOLEAN,
                    preferred_contact_time VARCHAR(50),
                    notes TEXT,
                    created_at TIMESTAMP,
                    imported_at TIMESTAMP,
                    consent_given BOOLEAN,
                    tcpa_compliant BOOLEAN
                )
            """)
            
            # Insert lead (with ON CONFLICT to avoid duplicates)
            cursor.execute("""
                INSERT INTO insurance_leads VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (lead_id) DO UPDATE SET
                    imported_at = EXCLUDED.imported_at
            """, (
                lead.lead_id, lead.source, lead.first_name, lead.last_name,
                lead.email, lead.phone, lead.date_of_birth, lead.zip_code,
                lead.state, lead.coverage_type, lead.household_income,
                lead.health_conditions, lead.current_coverage,
                lead.preferred_contact_time, lead.notes, lead.created_at,
                lead.imported_at, lead.consent_given, lead.tcpa_compliant
            ))
            
            conn.commit()
            logger.debug(f"Stored lead {lead.lead_id} in database")
            
        finally:
            cursor.close()
            conn.close()
    
    def _archive_to_s3(self, lead: InsuranceLead):
        """Archive encrypted lead to S3 for long-term storage"""
        key = f"leads/{lead.source}/{lead.created_at[:10]}/{lead.lead_id}.json"
        
        try:
            self.s3_client.put_object(
                Bucket=S3_BUCKET,
                Key=key,
                Body=json.dumps(lead.to_dict()),
                ServerSideEncryption='AES256'
            )
            logger.debug(f"Archived lead {lead.lead_id} to S3")
        except Exception as e:
            logger.warning(f"S3 archiving failed for {lead.lead_id}: {e}")
    
    def _parse_facebook_leads(self, fb_data: Dict) -> List[InsuranceLead]:
        """Parse Facebook lead data format"""
        # Placeholder - implement based on actual FB API response
        return []
    
    def _parse_api_leads(self, api_data: Dict) -> List[InsuranceLead]:
        """Parse third-party API lead data format"""
        # Placeholder - implement based on actual API response
        return []
    
    def _generate_lead_id(self) -> str:
        """Generate unique lead ID"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        random_suffix = os.urandom(4).hex()
        return f"LEAD-{timestamp}-{random_suffix}"


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Import insurance leads with HIPAA compliance')
    parser.add_argument('--source', required=True, choices=['facebook', 'csv', 'api'],
                        help='Lead source')
    parser.add_argument('--date', help='Date for Facebook leads (YYYY-MM-DD)')
    parser.add_argument('--file', help='CSV file path')
    parser.add_argument('--batch-id', help='API batch ID')
    
    args = parser.parse_args()
    
    importer = LeadImporter()
    leads = []
    
    if args.source == 'facebook':
        if not args.date:
            logger.error("--date required for Facebook import")
            return
        leads = importer.import_from_facebook(args.date)
    
    elif args.source == 'csv':
        if not args.file:
            logger.error("--file required for CSV import")
            return
        leads = importer.import_from_csv(args.file)
    
    elif args.source == 'api':
        if not args.batch_id:
            logger.error("--batch-id required for API import")
            return
        leads = importer.import_from_api(args.batch_id)
    
    if leads:
        count = importer.process_leads(leads)
        logger.info(f"Import complete: {count} leads processed")
    else:
        logger.warning("No leads imported")


if __name__ == '__main__':
    main()
