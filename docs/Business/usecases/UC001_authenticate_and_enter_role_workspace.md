<!-- CLASSIFICATION: INTERNAL -->
# UC001 — Authenticate and Enter Role-Specific Workspace

> **Use Case ID**: UC-LOGIN-001
> **Feature**: FEAT-IDENTITY-001, FEAT-TENANCY-001
> **Priority**: MUST
> **Actors**: Parent, Driver, Admin, School Operator, Compliance or Support User
> **Classification**: INTERNAL
> **Last Updated**: 2026-03-24

## 1. Description

A user opens the appropriate SBTM application, submits credentials to the API Gateway, receives an authenticated session, and enters a workspace that is filtered by both role and tenant context. This use case is the starting point for every other user-facing workflow in the platform.

## 2. Preconditions

- A valid user record exists in the platform.
- The user has been assigned a role that the target application understands.
- The API Gateway is reachable.
- The relevant web or mobile application is configured with the correct gateway base URL.

## 3. Triggers

- A user opens the login page or app launch screen.
- A user session has expired and re-authentication is required.

## 4. Main Flow

1. The user opens the Parent App, Driver App, or Admin Dashboard.
2. The user enters an email address and password.
3. The application sends the login request to the API Gateway.
4. The API Gateway validates the credentials against the user record.
5. The API Gateway returns an authenticated session payload that includes user identity, role, and tenant context.
6. The application stores the session token according to its platform-specific behavior.
7. The application loads role-scoped landing data, such as child cards for a parent, schedule context for a driver, or dashboard metrics for an admin.

## 5. Alternative Flows

### 5a. Invalid Credentials
- The API Gateway rejects the login request.
- The application shows an authentication failure state.
- No protected data is returned.

### 5b. Valid Credentials but Wrong Application Surface
- The user signs in successfully but does not have access to the requested workflow.
- The application shows a restricted or unavailable state rather than protected data.

### 5c. Expired Session
- The token is no longer valid.
- The application redirects the user to sign in again.

## 6. Postconditions

- The user has an authenticated session.
- The application knows the user role and tenant context.
- Protected routes can be requested according to role and scope rules.

## 7. Business Rules and Constraints

- Authentication is centralized through the API Gateway.
- Authorization is role-aware and tenant-aware.
- A successful login does not imply access to every tenant or route in the system.

## 8. Current-State Notes

- JWT-based login is implemented.
- Logout is currently a client-side token discard rather than a server-side session invalidation workflow.
- Different applications store the resulting session according to their own platform behavior.

## 9. Requirements Traced

| Requirement | Description |
| --- | --- |
| FR-IDENT-001 | Centralized authentication through the API Gateway |
| FR-IDENT-002 | Role-based access control |
| SR-AUTH-001 | Authenticated access for protected routes |
| SR-RBAC-001 | Role-aware and tenant-aware authorization |