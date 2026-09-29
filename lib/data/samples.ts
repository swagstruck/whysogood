/**
 * Realistic Sample Datasets for the Data Category Tools Suite:
 * - Employee Roster (CSV, TSV, JSON)
 * - E-Commerce Orders (CSV, JSON)
 * - Analytics Events (CSV, JSON)
 * - Multi-document Kubernetes Deployment (YAML)
 * - Complex Nested CRM Customer Records (JSON, YAML)
 */

import type { SamplePreset } from './types';

// ============================================================================
// 1. Employee Roster Samples
// ============================================================================

export const SAMPLE_EMPLOYEE_ROSTER_CSV = `id,first_name,last_name,email,department,role,salary,hire_date,country
101,Eleanor,Vance,eleanor.vance@whysogood.io,Engineering,Lead Architect,$142,500.00,2021-03-15,United States
102,Marcus,Chen,marcus.chen@whysogood.io,Engineering,Senior Fullstack Engineer,$128,000.00,2022-06-01,Canada
103,Amina,Diallo,amina.diallo@whysogood.io,Product,Principal Product Manager,$135,000.00,2020-11-12,France
104,Liam,O'Connor,liam.oconnor@whysogood.io,Design,Staff Product Designer,$118,000.00,2023-01-20,Ireland
105,Sofia,Rodriguez,sofia.rodriguez@whysogood.io,Marketing,Growth Marketing Lead,$105,000.00,2022-09-18,Spain
106,Taro,Tanaka,taro.tanaka@whysogood.io,Engineering,DevOps Specialist,$122,000.00,2021-08-05,Japan
107,Chloe,Dubois,chloe.dubois@whysogood.io,Sales,Enterprise Account Exec,$115,000.00,2023-04-10,Germany
108,Rajesh,Patel,rajesh.patel@whysogood.io,Data,Data Science Director,$150,000.00,2019-07-22,United Kingdom
109,Elena,Rostova,elena.rostova@whysogood.io,Operations,Chief of Staff,$145,000.00,2020-02-18,United States
110,Mateo,Silva,mateo.silva@whysogood.io,Engineering,Security Engineer,$130,000.00,2022-10-03,Brazil`;

export const SAMPLE_EMPLOYEE_ROSTER_TSV = `id\tfirst_name\tlast_name\temail\tdepartment\trole\tsalary\thire_date\tcountry
101\tEleanor\tVance\teleanor.vance@whysogood.io\tEngineering\tLead Architect\t$142,500.00\t2021-03-15\tUnited States
102\tMarcus\tChen\tmarcus.chen@whysogood.io\tEngineering\tSenior Fullstack Engineer\t$128,000.00\t2022-06-01\tCanada
103\tAmina\tDiallo\tamina.diallo@whysogood.io\tProduct\tPrincipal Product Manager\t$135,000.00\t2020-11-12\tFrance
104\tLiam\tO'Connor\tliam.oconnor@whysogood.io\tDesign\tStaff Product Designer\t$118,000.00\t2023-01-20\tIreland
105\tSofia\tRodriguez\tsofia.rodriguez@whysogood.io\tMarketing\tGrowth Marketing Lead\t$105,000.00\t2022-09-18\tSpain
106\tTaro\tTanaka\ttaro.tanaka@whysogood.io\tEngineering\tDevOps Specialist\t$122,000.00\t2021-08-05\tJapan
107\tChloe\tDubois\tchloe.dubois@whysogood.io\tSales\tEnterprise Account Exec\t$115,000.00\t2023-04-10\tGermany
108\tRajesh\tPatel\trajesh.patel@whysogood.io\tData\tData Science Director\t$150,000.00\t2019-07-22\tUnited Kingdom`;

export const SAMPLE_EMPLOYEE_ROSTER_JSON = JSON.stringify(
  [
    {
      id: 101,
      first_name: "Eleanor",
      last_name: "Vance",
      email: "eleanor.vance@whysogood.io",
      department: "Engineering",
      role: "Lead Architect",
      salary: 142500,
      hire_date: "2021-03-15",
      country: "United States",
    },
    {
      id: 102,
      first_name: "Marcus",
      last_name: "Chen",
      email: "marcus.chen@whysogood.io",
      department: "Engineering",
      role: "Senior Fullstack Engineer",
      salary: 128000,
      hire_date: "2022-06-01",
      country: "Canada",
    },
    {
      id: 103,
      first_name: "Amina",
      last_name: "Diallo",
      email: "amina.diallo@whysogood.io",
      department: "Product",
      role: "Principal Product Manager",
      salary: 135000,
      hire_date: "2020-11-12",
      country: "France",
    },
    {
      id: 104,
      first_name: "Liam",
      last_name: "O'Connor",
      email: "liam.oconnor@whysogood.io",
      department: "Design",
      role: "Staff Product Designer",
      salary: 118000,
      hire_date: "2023-01-20",
      country: "Ireland",
    },
    {
      id: 105,
      first_name: "Sofia",
      last_name: "Rodriguez",
      email: "sofia.rodriguez@whysogood.io",
      department: "Marketing",
      role: "Growth Marketing Lead",
      salary: 105000,
      hire_date: "2022-09-18",
      country: "Spain",
    },
  ],
  null,
  2
);

// ============================================================================
// 2. E-Commerce Orders Samples
// ============================================================================

export const SAMPLE_ECOMMERCE_ORDERS_CSV = `order_id,customer_name,email,sku,category,quantity,unit_price,total_amount,order_status,order_date
ORD-9821,Sarah Jenkins,sarah.j@gmail.com,SKU-WIRELESS-HEADPHONES,Electronics,1,$149.99,$149.99,Delivered,2026-09-12
ORD-9822,David Kim,dkim88@yahoo.com,SKU-ERGONOMIC-CHAIR,Furniture,2,$289.50,$579.00,Shipped,2026-09-14
ORD-9823,Elena Rostova,elena.r@outlook.com,SKU-USB-C-DOCK,Accessories,3,$79.99,$239.97,Delivered,2026-09-15
ORD-9824,Carlos Mendez,carlos.m@corp.org,SKU-4K-MONITOR-27,Electronics,1,$429.00,$429.00,Processing,2026-09-20
ORD-9825,Fatima Al-Mansoor,fatima.m@domain.ae,SKU-MECH-KEYBOARD,Accessories,1,$119.00,$119.00,Delivered,2026-09-21
ORD-9826,Lukas Weber,lukas.weber@gmx.de,SKU-DESK-MAT-LEATHER,Furniture,4,$34.50,$138.00,Delivered,2026-09-22
ORD-9827,Olivia Taylor,olivia.t@icloud.com,SKU-NOISE-CANCEL-MIC,Electronics,1,$189.00,$189.00,Cancelled,2026-09-23
ORD-9828,Nathan Brooks,nbrooks@fastmail.com,SKU-SMART-SPEAKER-MINI,Electronics,2,$49.99,$99.98,Shipped,2026-09-25`;

export const SAMPLE_ECOMMERCE_ORDERS_JSON = JSON.stringify(
  [
    {
      order_id: "ORD-9821",
      customer: {
        name: "Sarah Jenkins",
        email: "sarah.j@gmail.com",
      },
      item: {
        sku: "SKU-WIRELESS-HEADPHONES",
        category: "Electronics",
        quantity: 1,
        unit_price: 149.99,
      },
      total_amount: 149.99,
      order_status: "Delivered",
      order_date: "2026-09-12",
    },
    {
      order_id: "ORD-9822",
      customer: {
        name: "David Kim",
        email: "dkim88@yahoo.com",
      },
      item: {
        sku: "SKU-ERGONOMIC-CHAIR",
        category: "Furniture",
        quantity: 2,
        unit_price: 289.5,
      },
      total_amount: 579.0,
      order_status: "Shipped",
      order_date: "2026-09-14",
    },
    {
      order_id: "ORD-9823",
      customer: {
        name: "Elena Rostova",
        email: "elena.r@outlook.com",
      },
      item: {
        sku: "SKU-USB-C-DOCK",
        category: "Accessories",
        quantity: 3,
        unit_price: 79.99,
      },
      total_amount: 239.97,
      order_status: "Delivered",
      order_date: "2026-09-15",
    },
  ],
  null,
  2
);

// ============================================================================
// 3. Analytics Events Samples
// ============================================================================

export const SAMPLE_ANALYTICS_EVENTS_CSV = `event_id,session_id,user_id,event_name,page_url,referrer,device,browser,duration_ms,timestamp
EVT-1001,SESS-4491,USR-902,page_view,/home,google.com,Desktop,Chrome,450,2026-09-26T08:15:22Z
EVT-1002,SESS-4491,USR-902,click_cta,/home,google.com,Desktop,Chrome,12,2026-09-26T08:15:35Z
EVT-1003,SESS-4492,USR-903,page_view,/pricing,direct,Mobile,Safari,820,2026-09-26T08:16:01Z
EVT-1004,SESS-4492,USR-903,select_tier,/pricing,direct,Mobile,Safari,45,2026-09-26T08:16:44Z
EVT-1005,SESS-4493,USR-904,sign_up,/register,twitter.com,Desktop,Firefox,310,2026-09-26T08:17:10Z
EVT-1006,SESS-4494,USR-905,page_view,/tools/csv-cleaner,github.com,Desktop,Edge,612,2026-09-26T08:18:25Z
EVT-1007,SESS-4494,USR-905,file_upload,/tools/csv-cleaner,github.com,Desktop,Edge,1540,2026-09-26T08:19:02Z
EVT-1008,SESS-4495,USR-906,export_csv,/tools/csv-sorter,direct,Tablet,Safari,220,2026-09-26T08:20:15Z`;

export const SAMPLE_ANALYTICS_EVENTS_JSON = JSON.stringify(
  [
    {
      event_id: "EVT-1001",
      session_id: "SESS-4491",
      user_id: "USR-902",
      event_name: "page_view",
      page_url: "/home",
      referrer: "google.com",
      client: {
        device: "Desktop",
        browser: "Chrome",
      },
      duration_ms: 450,
      timestamp: "2026-09-26T08:15:22Z",
    },
    {
      event_id: "EVT-1002",
      session_id: "SESS-4491",
      user_id: "USR-902",
      event_name: "click_cta",
      page_url: "/home",
      referrer: "google.com",
      client: {
        device: "Desktop",
        browser: "Chrome",
      },
      duration_ms: 12,
      timestamp: "2026-09-26T08:15:35Z",
    },
    {
      event_id: "EVT-1003",
      session_id: "SESS-4492",
      user_id: "USR-903",
      event_name: "page_view",
      page_url: "/pricing",
      referrer: "direct",
      client: {
        device: "Mobile",
        browser: "Safari",
      },
      duration_ms: 820,
      timestamp: "2026-09-26T08:16:01Z",
    },
  ],
  null,
  2
);

// ============================================================================
// 4. Multi-Document Kubernetes Deployment YAML
// ============================================================================

export const SAMPLE_KUBERNETES_DEPLOYMENT_YAML = `---
apiVersion: v1
kind: Namespace
metadata:
  name: whysogood-production
  labels:
    environment: production
    managed-by: argocd
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: whysogood-production
data:
  APP_ENV: production
  MAX_CONNECTIONS: "5000"
  CACHE_TTL_SECONDS: "3600"
  ENABLE_METRICS: "true"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: whysogood-production
  labels:
    app: api-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      containers:
        - name: web
          image: whysogood/api-service:v2.4.0
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
              name: http
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          envFrom:
            - configMapRef:
                name: app-config
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: whysogood-production
spec:
  type: ClusterIP
  selector:
    app: api-service
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
      name: http`;

// ============================================================================
// 5. Complex Nested CRM Customer Records JSON
// ============================================================================

export const SAMPLE_CRM_CUSTOMERS_JSON = JSON.stringify(
  [
    {
      account_id: "ACC-10901",
      company: {
        name: "Acme Industrial Technologies",
        domain: "acme-tech.com",
        tier: "Enterprise",
        employee_count: 1450,
      },
      billing: {
        currency: "USD",
        monthly_mrr: 12500,
        address: {
          street: "742 Evergreen Terrace",
          city: "Seattle",
          state: "WA",
          postal_code: 98101,
          country: "United States",
        },
      },
      primary_contact: {
        name: "Dr. Evelyn Reed",
        title: "VP of Engineering",
        email: "evelyn.reed@acme-tech.com",
        phone: "+1-206-555-0199",
      },
      features_enabled: ["sso", "audit_logs", "dedicated_ip", "sla_99_99"],
      is_active: true,
      contract_start: "2024-01-15",
      contract_end: "2027-01-14",
    },
    {
      account_id: "ACC-10902",
      company: {
        name: "BioNova Therapeutics",
        domain: "bionova-rx.eu",
        tier: "Growth",
        employee_count: 320,
      },
      billing: {
        currency: "EUR",
        monthly_mrr: 4800,
        address: {
          street: "14 Rue de la Paix",
          city: "Paris",
          state: "IDF",
          postal_code: 75002,
          country: "France",
        },
      },
      primary_contact: {
        name: "Jean-Luc Moreau",
        title: "Head of IT Systems",
        email: "jl.moreau@bionova-rx.eu",
        phone: "+33-1-42-68-55-00",
      },
      features_enabled: ["sso", "hipaa_compliance", "daily_backups"],
      is_active: true,
      contract_start: "2025-05-01",
      contract_end: "2026-05-01",
    },
    {
      account_id: "ACC-10903",
      company: {
        name: "Apex Logistics Global",
        domain: "apex-logistics.sg",
        tier: "Scale",
        employee_count: 850,
      },
      billing: {
        currency: "USD",
        monthly_mrr: 8900,
        address: {
          street: "10 Marina Boulevard",
          city: "Singapore",
          state: "Marina Bay",
          postal_code: "018983",
          country: "Singapore",
        },
      },
      primary_contact: {
        name: "Mei-Ling Tan",
        title: "Chief Technology Officer",
        email: "ml.tan@apex-logistics.sg",
        phone: "+65-6812-4900",
      },
      features_enabled: ["sso", "audit_logs", "api_rate_burst", "custom_domains"],
      is_active: true,
      contract_start: "2023-09-01",
      contract_end: "2026-08-31",
    },
  ],
  null,
  2
);

export const SAMPLE_CRM_CUSTOMERS_YAML = `---
- account_id: ACC-10901
  company:
    name: Acme Industrial Technologies
    domain: acme-tech.com
    tier: Enterprise
    employee_count: 1450
  billing:
    currency: USD
    monthly_mrr: 12500
    address:
      street: 742 Evergreen Terrace
      city: Seattle
      state: WA
      postal_code: 98101
      country: United States
  primary_contact:
    name: Dr. Evelyn Reed
    title: VP of Engineering
    email: evelyn.reed@acme-tech.com
    phone: +1-206-555-0199
  features_enabled:
    - sso
    - audit_logs
    - dedicated_ip
    - sla_99_99
  is_active: true
  contract_start: "2024-01-15"
  contract_end: "2027-01-14"
- account_id: ACC-10902
  company:
    name: BioNova Therapeutics
    domain: bionova-rx.eu
    tier: Growth
    employee_count: 320
  billing:
    currency: EUR
    monthly_mrr: 4800
    address:
      street: 14 Rue de la Paix
      city: Paris
      state: IDF
      postal_code: 75002
      country: France
  primary_contact:
    name: Jean-Luc Moreau
    title: Head of IT Systems
    email: jl.moreau@bionova-rx.eu
    phone: +33-1-42-68-55-00
  features_enabled:
    - sso
    - hipaa_compliance
    - daily_backups
  is_active: true
  contract_start: "2025-05-01"
  contract_end: "2026-05-01"`;

// ============================================================================
// 6. Registered Sample Presets Index
// ============================================================================

export const DATA_SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'employee-roster-csv',
    name: 'Employee Roster (CSV)',
    description: '10 enterprise staff records with salaries, departments, hire dates, and countries.',
    data: SAMPLE_EMPLOYEE_ROSTER_CSV,
    category: 'CSV',
  },
  {
    id: 'employee-roster-tsv',
    name: 'Employee Roster (TSV)',
    description: 'Tab-delimited staff records for TSV testing and delimiter auto-detection.',
    data: SAMPLE_EMPLOYEE_ROSTER_TSV,
    category: 'TSV',
  },
  {
    id: 'employee-roster-json',
    name: 'Employee Roster (JSON)',
    description: 'Structured employee objects for JSON to CSV / YAML conversions.',
    data: SAMPLE_EMPLOYEE_ROSTER_JSON,
    category: 'JSON',
  },
  {
    id: 'ecommerce-orders-csv',
    name: 'E-Commerce Orders (CSV)',
    description: 'Multi-item customer orders with SKUs, quantities, prices, and statuses.',
    data: SAMPLE_ECOMMERCE_ORDERS_CSV,
    category: 'CSV',
  },
  {
    id: 'ecommerce-orders-json',
    name: 'E-Commerce Orders (JSON)',
    description: 'Nested orders with customer and item sub-objects for dot-flattening.',
    data: SAMPLE_ECOMMERCE_ORDERS_JSON,
    category: 'JSON',
  },
  {
    id: 'analytics-events-csv',
    name: 'Analytics Events (CSV)',
    description: 'User sessions, page views, CTA clicks, and browser timing metrics.',
    data: SAMPLE_ANALYTICS_EVENTS_CSV,
    category: 'CSV',
  },
  {
    id: 'analytics-events-json',
    name: 'Analytics Events (JSON)',
    description: 'Nested client metadata and clickstream events.',
    data: SAMPLE_ANALYTICS_EVENTS_JSON,
    category: 'JSON',
  },
  {
    id: 'kubernetes-deployment-yaml',
    name: 'Kubernetes Cluster Manifests (YAML)',
    description: '4-document stream: Namespace, ConfigMap, Deployment with containers, and Service.',
    data: SAMPLE_KUBERNETES_DEPLOYMENT_YAML,
    category: 'YAML',
  },
  {
    id: 'crm-customers-json',
    name: 'CRM Enterprise Accounts (JSON)',
    description: 'Deeply nested company, billing address, contacts, and features arrays.',
    data: SAMPLE_CRM_CUSTOMERS_JSON,
    category: 'JSON',
  },
  {
    id: 'crm-customers-yaml',
    name: 'CRM Enterprise Accounts (YAML)',
    description: 'Hierarchical YAML customer records with nested maps and sequence lists.',
    data: SAMPLE_CRM_CUSTOMERS_YAML,
    category: 'YAML',
  },
];

export function getSamplePresetById(id: string): SamplePreset | undefined {
  return DATA_SAMPLE_PRESETS.find(p => p.id === id);
}

export function getSamplePresetsByCategory(category: string): SamplePreset[] {
  return DATA_SAMPLE_PRESETS.filter(
    p => p.category.toLowerCase() === category.toLowerCase()
  );
}
