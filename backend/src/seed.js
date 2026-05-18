const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Project = require('./models/Project');

const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  await User.deleteMany({});
  await Project.deleteMany({});
  console.log('Cleared existing data');

  const passwordHash = await bcrypt.hash('auditor123', 12);
  const execHash = await bcrypt.hash('executive123', 12);

  const [auditor, executive] = await User.insertMany([
    { name: 'Alex Rivera', email: 'auditor@company.com', passwordHash, role: 'auditor' },
    { name: 'Morgan Chen', email: 'executive@company.com', passwordHash: execHash, role: 'executive' },
  ]);
  console.log('Created users');

  const today = new Date();
  const daysFromNow = (n) => new Date(today.getTime() + n * 86400000);
  const daysAgo = (n) => new Date(today.getTime() - n * 86400000);

  await Project.insertMany([
    {
      name: 'Customer Churn Prediction Engine',
      description: 'ML model to predict customer churn risk score using behavioral and transactional data. Outputs real-time risk flags to the CRM.',
      owner: { name: 'Sarah Lim', department: 'Data Science', email: 'sarah.lim@company.com' },
      status: 'active',
      riskLevel: 'medium',
      techStack: ['Python', 'scikit-learn', 'XGBoost', 'MLflow', 'PostgreSQL', 'FastAPI'],
      startDate: daysAgo(90),
      targetEndDate: daysFromNow(30),
      budget: 45000,
      notes: 'Model is currently in A/B testing with the sales team. Initial results show 78% recall on high-risk customers.',
      milestones: [
        { title: 'Data collection & preprocessing', dueDate: daysAgo(70), completed: true, completedAt: daysAgo(68) },
        { title: 'Baseline model training', dueDate: daysAgo(45), completed: true, completedAt: daysAgo(44) },
        { title: 'A/B testing with sales team', dueDate: daysAgo(10), completed: true, completedAt: daysAgo(8) },
        { title: 'Production deployment', dueDate: daysFromNow(30), completed: false },
      ],
      incidents: [
        {
          title: 'Data pipeline latency spike',
          description: 'Batch inference pipeline exceeded 4-hour SLA during initial load testing. Root cause: unindexed query on transactions table.',
          date: daysAgo(20),
          severity: 'medium',
          resolved: true,
          resolvedAt: daysAgo(18),
          resolvedNotes: 'Added composite index on customer_id + created_at. Latency reduced to 22 minutes.',
        },
      ],
      createdBy: auditor._id,
    },
    {
      name: 'AI-Powered Contract Reviewer',
      description: 'LLM-based system to review vendor contracts, flag risky clauses, and summarize obligations. Integrates with DocuSign workflow.',
      owner: { name: 'James Thornton', department: 'Legal & Compliance', email: 'j.thornton@company.com' },
      status: 'active',
      riskLevel: 'high',
      techStack: ['Python', 'LangChain', 'OpenAI GPT-4o', 'Pinecone', 'React', 'Node.js'],
      startDate: daysAgo(60),
      targetEndDate: daysFromNow(60),
      budget: 120000,
      notes: 'High risk due to regulatory implications. All outputs require human review before any action. Legal team has approved use case under current AI policy framework.',
      milestones: [
        { title: 'Proof of concept with 50 sample contracts', dueDate: daysAgo(40), completed: true, completedAt: daysAgo(38) },
        { title: 'Legal review of AI output quality', dueDate: daysAgo(15), completed: true, completedAt: daysAgo(12) },
        { title: 'Integration with DocuSign API', dueDate: daysFromNow(15), completed: false },
        { title: 'Pilot with 3 vendor contracts', dueDate: daysFromNow(45), completed: false },
        { title: 'Full rollout', dueDate: daysFromNow(60), completed: false },
      ],
      incidents: [
        {
          title: 'Hallucinated clause reference',
          description: 'During PoC testing, the model cited a non-existent clause number in its summary output for 2 out of 50 contracts.',
          date: daysAgo(35),
          severity: 'high',
          resolved: true,
          resolvedAt: daysAgo(30),
          resolvedNotes: 'Added post-processing validation step to cross-reference cited clauses against document. All outputs now include confidence scores.',
        },
        {
          title: 'PII detected in prompt logs',
          description: 'Audit found that contract text containing PII was being stored in plain-text prompt logs for debugging.',
          date: daysAgo(10),
          severity: 'critical',
          resolved: false,
        },
      ],
      createdBy: auditor._id,
    },
    {
      name: 'Internal IT Helpdesk Chatbot',
      description: 'Conversational AI assistant for employee IT support. Handles password resets, software requests, and FAQ resolution.',
      owner: { name: 'Priya Nair', department: 'IT Operations', email: 'p.nair@company.com' },
      status: 'completed',
      riskLevel: 'low',
      techStack: ['Python', 'Rasa', 'Microsoft Bot Framework', 'Azure Cognitive Services', 'SQL Server'],
      startDate: daysAgo(180),
      targetEndDate: daysAgo(30),
      budget: 28000,
      notes: 'Successfully deployed. Handling ~450 tickets/month with 91% resolution rate without human escalation. Monitoring phase ongoing.',
      milestones: [
        { title: 'Requirement gathering', dueDate: daysAgo(160), completed: true, completedAt: daysAgo(158) },
        { title: 'Intent model training', dueDate: daysAgo(120), completed: true, completedAt: daysAgo(118) },
        { title: 'UAT with IT helpdesk team', dueDate: daysAgo(60), completed: true, completedAt: daysAgo(55) },
        { title: 'Production launch', dueDate: daysAgo(30), completed: true, completedAt: daysAgo(30) },
      ],
      incidents: [],
      createdBy: auditor._id,
    },
    {
      name: 'Automated Financial Report Summarizer',
      description: 'Uses generative AI to produce executive summaries from quarterly financial reports. Summaries are reviewed before distribution.',
      owner: { name: 'Daniel Park', department: 'Finance', email: 'd.park@company.com' },
      status: 'planning',
      riskLevel: 'medium',
      techStack: ['Python', 'Anthropic Claude', 'LangChain', 'AWS Lambda', 'S3'],
      startDate: daysFromNow(14),
      targetEndDate: daysFromNow(90),
      budget: 35000,
      notes: 'Awaiting sign-off from CFO. Vendor evaluation between OpenAI and Anthropic is complete — Anthropic Claude 3.5 selected for accuracy and citation quality.',
      milestones: [
        { title: 'Vendor selection & contract', dueDate: daysFromNow(10), completed: false },
        { title: 'Prototype with 2 past reports', dueDate: daysFromNow(35), completed: false },
        { title: 'Finance team review & sign-off', dueDate: daysFromNow(60), completed: false },
        { title: 'Q3 report pilot', dueDate: daysFromNow(90), completed: false },
      ],
      incidents: [],
      createdBy: auditor._id,
    },
    {
      name: 'Predictive Maintenance for Manufacturing',
      description: 'IoT sensor data fed into an anomaly detection model to predict equipment failure 48 hours in advance in the production floor.',
      owner: { name: 'Kenji Watanabe', department: 'Manufacturing & Engineering', email: 'k.watanabe@company.com' },
      status: 'failed',
      riskLevel: 'critical',
      techStack: ['Python', 'TensorFlow', 'Apache Kafka', 'InfluxDB', 'Grafana', 'Docker'],
      startDate: daysAgo(120),
      targetEndDate: daysAgo(30),
      budget: 95000,
      notes: 'Project was terminated after sensor data quality issues could not be resolved within budget. The underlying data infrastructure needs a full overhaul before resuming. A post-mortem report has been filed.',
      milestones: [
        { title: 'Sensor data ingestion setup', dueDate: daysAgo(100), completed: true, completedAt: daysAgo(95) },
        { title: 'Anomaly detection baseline', dueDate: daysAgo(70), completed: true, completedAt: daysAgo(72) },
        { title: 'Real-time inference pipeline', dueDate: daysAgo(40), completed: false },
        { title: 'Pilot on production floor', dueDate: daysAgo(10), completed: false },
      ],
      incidents: [
        {
          title: 'Sensor data corruption on line 3',
          description: '28% of sensor readings from production line 3 were found to be corrupted due to electromagnetic interference from nearby welding equipment.',
          date: daysAgo(65),
          severity: 'high',
          resolved: false,
        },
        {
          title: 'Model false positive rate exceeded threshold',
          description: 'Anomaly detection model generating 40+ false alarms per day, causing alert fatigue and work stoppages on the floor.',
          date: daysAgo(50),
          severity: 'critical',
          resolved: false,
        },
        {
          title: 'Kafka cluster out-of-memory',
          description: 'Message broker ran out of memory during a 3-day continuous run due to improperly configured retention policy.',
          date: daysAgo(40),
          severity: 'high',
          resolved: true,
          resolvedAt: daysAgo(38),
          resolvedNotes: 'Retention policy fixed. However, data loss was detected for a 6-hour window.',
        },
      ],
      createdBy: auditor._id,
    },
    {
      name: 'Employee Sentiment Analysis Platform',
      description: 'NLP analysis of anonymized employee survey responses to identify engagement trends, morale signals, and retention risks.',
      owner: { name: 'Fatima Al-Hassan', department: 'Human Resources', email: 'f.alhassan@company.com' },
      status: 'on-hold',
      riskLevel: 'high',
      techStack: ['Python', 'HuggingFace Transformers', 'BERT', 'MongoDB', 'Tableau', 'dbt'],
      startDate: daysAgo(50),
      targetEndDate: daysFromNow(45),
      budget: 55000,
      notes: 'Project placed on hold pending legal review of data privacy implications. HR and Legal are consulting with external privacy counsel. Expected to resume in 6 weeks.',
      milestones: [
        { title: 'Survey data anonymization framework', dueDate: daysAgo(35), completed: true, completedAt: daysAgo(33) },
        { title: 'Sentiment model fine-tuning', dueDate: daysAgo(10), completed: false },
        { title: 'Legal & privacy review', dueDate: daysFromNow(20), completed: false },
        { title: 'Dashboard for HR leadership', dueDate: daysFromNow(45), completed: false },
      ],
      incidents: [
        {
          title: 'Potential re-identification risk discovered',
          description: 'Privacy audit found that responses with rare role + tenure combinations (e.g., "only VP with 15+ years") could be re-identified even after anonymization.',
          date: daysAgo(12),
          severity: 'high',
          resolved: false,
        },
      ],
      createdBy: auditor._id,
    },
  ]);

  console.log('Created 6 sample projects');
  console.log('\nSeed complete!');
  console.log('  Auditor:   auditor@company.com   / auditor123');
  console.log('  Executive: executive@company.com / executive123');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
