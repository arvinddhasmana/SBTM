# SBTM - School Bus Transport Management System

> **Production-ready school bus tracking platform that deploys to your Azure or GCP account in 30 minutes**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE-DEPLOYMENT)
[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](docs/DEPLOY_AZURE.md)
[![Deploy to GCP](https://deploy.cloud.run)](docs/DEPLOY_GCP.md)

## 🎯 For School Districts

Stop paying per-student SaaS fees. Deploy SBTM to **your own cloud** and pay only infrastructure costs ($250-500/month regardless of district size).

### What You Get:
- ✅ **Real-time GPS tracking** of all buses with live map view
- ✅ **Automated student presence** detection via BLE SmartTags
- ✅ **Emergency alerts** instantly notify parents & administrators
- ✅ **Parent mobile apps** for iOS & Android
- ✅ **Compliance tracking** for inspections and regulations
- ✅ **Video event management** for incident documentation
- ✅ **Admin dashboard** for fleet and route management
- ✅ **Driver mobile app** with offline support

### Why SBTM?

| Traditional SaaS | SBTM (Self-Hosted) |
|------------------|-------------------|
| $5-10 per student/month | $250-500 total/month |
| Data on vendor servers | Data in YOUR cloud (Azure/GCP) |
| Vendor lock-in | Full control & customization |
| Feature requests → roadmap | Custom features possible |
| **$50K-100K/year** for 1000 students | **$3K-6K/year** + optional support |

**ROI Example**: A district with 1,000 students saves **$44K-94K annually** compared to typical SaaS solutions.

## 🚀 Deploy in 30 Minutes

### Prerequisites
- Azure or GCP account with billing enabled
- Cloud CLI installed (`az` or `gcloud`)
- 30 minutes of time

### Azure Deployment
```bash
git clone https://github.com/arvinddhasmana/SBTM_Releases.git
cd SBTM_Releases/deploy/azure
./quick-deploy.sh
```

### GCP Deployment
```bash
git clone https://github.com/arvinddhasmana/SBTM_Releases.git
cd SBTM_Releases/deploy/gcp
./quick-deploy.sh
```

**That's it!** The script will:
1. ✅ Provision infrastructure (Kubernetes, PostgreSQL, Redis, Storage)
2. ✅ Deploy all microservices
3. ✅ Seed demo data
4. ✅ Output URLs and credentials

**Next**: See [Quick Start Guide](docs/QUICK_START.md) for detailed walkthrough.

## 📊 Cost Breakdown

| District Size | Students | Buses | Azure Cost/mo | GCP Cost/mo |
|--------------|----------|-------|---------------|-------------|
| Small | 500 | 10 | $250 | $200 |
| Medium | 2,000 | 50 | $400 | $350 |
| Large | 5,000+ | 100+ | $800 | $700 |

💰 [Interactive Cost Calculator](https://docs.google.com/spreadsheets/d/[YOUR_SHEET_ID])

**Note**: Costs are estimates based on typical usage. Actual costs depend on usage patterns, data retention, and selected tiers.

## 📺 Demo Video

[![SBTM Demo](https://img.youtube.com/vi/[YOUR_VIDEO_ID]/maxresdefault.jpg)](https://youtu.be/[YOUR_VIDEO_ID])

*10-minute walkthrough: Deployment → Admin Setup → Driver Workflow → Parent Experience*

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Parent App     │────▶│   API Gateway    │◀────│ Admin Dashboard │
│  (Mobile)       │     │   (NestJS)       │     │  (React)        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                         │
         │              ┌────────┴────────┐               │
         │              │                 │               │
         │       ┌──────▼─────┐    ┌─────▼──────┐       │
         │       │ GPS Track  │    │  Alerts    │       │
         └──────▶│  Service   │    │  Service   │◀──────┘
                 └────────────┘    └────────────┘
                        │                 │
                 ┌──────▼─────┐    ┌─────▼──────┐
                 │  Presence  │    │   Video    │
                 │  Service   │    │  Service   │
                 └────────────┘    └────────────┘
                        │                 │
                 ┌──────┴─────────────────┴──────┐
                 │  PostgreSQL + Redis + Storage  │
                 └────────────────────────────────┘
```

[Detailed Architecture Documentation](docs/architecture/OVERVIEW.md)

### Technology Stack

**Backend Services**:
- **Framework**: NestJS, Express (TypeScript)
- **Database**: PostgreSQL 15+ with TypeORM/Prisma
- **Cache/Queue**: Redis 7+ with BullMQ
- **Storage**: MinIO (S3-compatible) / Cloud Storage
- **Real-time**: WebSockets, Socket.IO

**Frontend Applications**:
- **Admin Dashboard**: React 19, Vite, Tailwind CSS
- **Parent Portal**: React 19, Vite
- **Driver App**: React Native, Expo SDK
- **Maps**: Leaflet / Google Maps

**Infrastructure**:
- **Orchestration**: Kubernetes (AKS/GKE Autopilot)
- **CI/CD**: GitHub Actions
- **Monitoring**: Cloud Operations (Azure Monitor/Cloud Operations)
- **Security**: JWT, RBAC, end-to-end encryption

## 📖 Documentation

### Getting Started
- [Quick Start Guide](docs/QUICK_START.md) - 15 minutes
- [Azure Deployment](docs/DEPLOY_AZURE.md) - Complete guide
- [GCP Deployment](docs/DEPLOY_GCP.md) - Complete guide
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues & solutions

### User Guides
- [Admin Guide](docs/guides/admin-guide.md) - Fleet & route management
- [Driver Guide](docs/guides/driver-guide.md) - Mobile app usage
- [Parent Guide](docs/guides/parent-guide.md) - Tracking your children

### Technical Documentation
- [Architecture Overview](docs/architecture/OVERVIEW.md)
- [Security & Privacy](docs/architecture/SECURITY.md)
- [API Reference](docs/API_REFERENCE.md)
- [Features List](docs/FEATURES.md)

### Business Information
- [Pricing & Support](docs/PRICING.md)
- [SBTM vs Alternatives](docs/COMPARISON.md)
- [FAQ](docs/FAQ.md)

## 💼 Commercial Support

Self-hosting is free, but we offer professional support for peace of mind:

| Plan | Price | Support | SLA | Best For |
|------|-------|---------|-----|----------|
| **Community** | Free | GitHub Issues | Best effort | Developers, tech-savvy districts |
| **Professional** | $500/mo | Email | 48 hours | Small-medium districts |
| **Enterprise** | $2000/mo | Phone + Email | 4 hours | Large districts, custom features |

**Professional Support Includes**:
- Priority email support
- Security updates & patches
- Configuration assistance
- Monthly health checks

**Enterprise Support Includes**:
- Everything in Professional
- Phone support with dedicated contact
- Custom feature development
- Integration assistance
- Training sessions
- SLA guarantees

[Contact Us for Support](mailto:arvinddhasmana@gmail.com) | [Schedule a Demo](https://calendly.com/your-link)

## 🔒 Security & Compliance

### Security Features
- 🔐 JWT authentication with refresh tokens
- 🔒 Role-Based Access Control (RBAC)
- 🛡️ End-to-end encryption for sensitive data
- 📋 Complete audit logging
- 🔍 Regular security updates

### Compliance Ready
- ✅ GDPR-compliant data handling
- ✅ FERPA-ready (student privacy)
- ✅ SOC 2 ready architecture
- ✅ Data residency control (your cloud, your region)
- ✅ Configurable data retention policies

[Security Documentation](docs/architecture/SECURITY.md) | [Privacy Policy](docs/legal/PRIVACY_POLICY.md)

## 🤝 Community & Support

### Get Help
- **Documentation**: Start with [Quick Start Guide](docs/QUICK_START.md)
- **GitHub Issues**: [Report bugs or request features](https://github.com/arvinddhasmana/SBTM_Releases/issues)
- **Discussions**: [Ask questions, share ideas](https://github.com/arvinddhasmana/SBTM_Releases/discussions)
- **Email**: arvinddhasmana@gmail.com (for commercial support)

### Contribute
We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Stay Updated
- ⭐ Star this repository to follow updates
- 👀 Watch for new releases
- 📧 Join our mailing list: [Subscribe](https://example.com/subscribe)

## 📜 License

This project uses a **dual-license model**:

- **Deployment Tools & Documentation**: [MIT License](LICENSE-DEPLOYMENT) - fully open source
- **Container Images**: Free to use for any purpose
- **Source Code**: Available for viewing under [Commercial License](LICENSE-COMMERCIAL)

### What This Means
- ✅ Deploy SBTM anywhere, free of charge
- ✅ Use in commercial and non-commercial environments
- ✅ View and study the source code
- ✅ Modify deployment scripts and documentation
- ❌ Cannot distribute modified source code without license
- ❌ Cannot create competing hosted service without license

For source code licensing inquiries: arvinddhasmana@gmail.com

## 🏆 Why Choose SBTM?

### For School Districts
- **Cost Savings**: 90% lower cost than SaaS alternatives
- **Data Control**: Your data stays in your cloud, your region
- **No Vendor Lock-in**: Open deployment, standard technologies
- **Compliance**: Meet data residency and privacy requirements
- **Customization**: Modify to fit your specific needs

### For Technology Teams
- **Easy Deployment**: One command, 30 minutes to production
- **Modern Stack**: Kubernetes, microservices, React, TypeScript
- **Cloud Agnostic**: Runs on Azure or GCP
- **Production Ready**: Used in real deployments
- **Well Documented**: Comprehensive guides and API docs

### For Parents
- **Peace of Mind**: Real-time tracking of your children
- **Instant Alerts**: Emergency notifications when they matter
- **Attendance**: Know when your child boards and alights
- **ETA Updates**: Estimated arrival times at stops
- **Mobile Apps**: Native iOS and Android applications

## 📊 Success Stories

> "We deployed SBTM in under an hour and saved $75K in year one compared to our previous SaaS solution. The data sovereignty was crucial for our board approval."
>
> — *IT Director, 2,500-student district*

> "The ability to customize the solution for our specific workflows was game-changing. With our previous vendor, we had to adapt to their system."
>
> — *Transportation Manager, 5,000-student district*

[Read More Case Studies](docs/CASE_STUDIES.md) | [Request Pilot Program](mailto:arvinddhasmana@gmail.com)

## 🗺️ Roadmap

### Current (v1.0)
- ✅ Real-time GPS tracking
- ✅ Student presence detection
- ✅ Emergency alerts
- ✅ Parent & driver mobile apps
- ✅ Admin dashboard
- ✅ Video event management
- ✅ Azure & GCP deployment

### Coming Soon (v1.1)
- 🔄 Route optimization AI
- 🔄 Automated route planning
- 🔄 Advanced analytics dashboard
- 🔄 SMS/email notifications
- 🔄 Multi-language support

### Future (v2.0)
- 📋 Parent request portal
- 📋 Transportation billing
- 📋 Predictive maintenance
- 📋 Carbon footprint tracking

[View Full Roadmap](https://github.com/arvinddhasmana/SBTM_Releases/projects/1)

## ❤️ About

**Built by**: School transportation professionals and software engineers who believe school districts deserve better, more affordable technology.

**Mission**: Make world-class school bus management accessible to every district, regardless of size or budget.

**Contact**:
- Email: arvinddhasmana@gmail.com
- LinkedIn: [Your Profile](https://linkedin.com/in/your-profile)
- Twitter: [@your_handle](https://twitter.com/your_handle)

---

⭐ **Star this repo** if you find it useful!

🚀 **Ready to deploy?** [Get started in 30 minutes →](docs/QUICK_START.md)

💬 **Questions?** [Open a discussion →](https://github.com/arvinddhasmana/SBTM_Releases/discussions)

---

*SBTM is not affiliated with any school district or government entity. This is an independent open-source project.*
