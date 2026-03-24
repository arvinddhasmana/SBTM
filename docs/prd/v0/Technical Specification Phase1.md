# 📑 Technical Specification Document — Phase 1 (OSTA SBMS)

## 1. **GPS Tracking & Parent Notifications**
### Hardware
- GPS units installed on all buses (ruggedized, tamper‑proof, 4G/5G enabled).  
- Backup battery for uninterrupted tracking.  

### Software
- Centralized tracking platform with:  
  - **Parent App** (iOS/Android): live bus location, ETA, push notifications.  
  - **Admin Dashboard**: route monitoring, delay alerts, compliance logs.  

### Integration
- API connectivity with OSTA’s existing PWA notification system.  
- Secure cloud hosting with Canadian data residency.  

### Vendor Criteria
- Proven deployments in Canadian school boards.  
- SLA for uptime > 99.9%.  
- Compliance with PIPEDA and Ontario privacy laws.  

---

## 2. **Driver Mobile Application**
### Hardware
- Tablets or rugged smartphones provided to drivers.  
- Mounting kits for safe in‑vehicle use.  

### Software
- Features:  
  - Turn‑by‑turn navigation (school‑optimized routes).  
  - Digital student roster with boarding confirmation.  
  - Incident reporting (mechanical, behavioral, emergency).  

### Integration
- Sync with GPS tracking system and central dashboard.  
- Secure login with driver ID + two‑factor authentication.  

### Vendor Criteria
- Offline functionality in low‑signal areas.  
- Easy UI for non‑technical users.  
- Multilingual support (English/French).  

---

## 3. **Emergency Safety Features**
### Hardware
- Panic button installed in buses, linked to GPS unit.  
- Geo‑fencing sensors integrated with GPS.  

### Software
- Automated escalation workflow:  
  - Alert to OSTA central monitoring.  
  - Notification to parents (if delay/deviation).  
  - Escalation to law enforcement if required.  

### Vendor Criteria
- Integration with Ottawa Police Service emergency protocols.  
- Redundant communication channels (cellular + satellite backup).  

---

## 4. **Video Surveillance Integration**
### Hardware
- High‑definition cameras (minimum 1080p, night vision).  
- Placement: front, middle, rear interior + entry/exit exterior.  
- DVR unit with encrypted storage onboard.  

### Software
- Central monitoring system accessible to OSTA administrators.  
- Secure cloud storage with retention policies (30–90 days).  
- AI‑assisted monitoring (detect fights, vandalism, unsafe driver behavior).  

### Integration
- Panic button triggers automatic video flagging.  
- Geo‑fence breach triggers video recording alert.  

### Vendor Criteria
- Compliance with Ontario privacy and surveillance laws.  
- Role‑based access control (only authorized personnel).  
- End‑to‑end encryption for video feeds.  

---

## 5. **Compliance & Training**
### Requirements
- Automated driver background verification (licensing, criminal record, medical fitness).  
- Digital training modules for:  
  - Emergency handling.  
  - Use of GPS/driver app.  
  - Privacy and surveillance awareness.  

### Vendor Criteria
- Certification aligned with Ontario Ministry of Transportation.  
- Audit trail for compliance reporting.  

---

# 🧩 Integration Architecture
- **Cloud‑based central hub**: integrates GPS, driver app, video surveillance, and parent notifications.  
- **APIs**: open standards (REST/JSON) for future expansion.  
- **Data Security**: end‑to‑end encryption, Canadian data residency, role‑based access.  
- **Scalability**: modular design to expand to Phase 2 and Phase 3 features.  

---

# 📌 Vendor Selection Criteria
1. **Experience**: Demonstrated deployments in Canadian school boards.  
2. **Compliance**: PIPEDA, Ontario Ministry of Transportation, OCDSB/OCSB policies.  
3. **Support**: 24/7 helpdesk, local Ottawa presence preferred.  
4. **Cost Transparency**: Clear breakdown of hardware, software, licensing, and maintenance.  
5. **Future‑Proofing**: Ability to integrate predictive analytics, sustainability tracking, and multimodal transport in later phases.  

---

# 🎯 Expected Deliverables (Phase 1)
- GPS tracking hardware + parent app.  
- Driver mobile app with navigation and incident reporting.  
- Emergency safety features (panic button + geo‑fencing).  
- Video surveillance system (cameras + central monitoring).  
- Compliance framework (training, background checks, legal alignment).  
