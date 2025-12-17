# Requirements Document

## Introduction

This feature enables users to utilize the same email address for both candidate and company accounts within the job matching application. This eliminates confusion and provides a seamless experience for users who may operate in both roles, such as freelancers, consultants, or individuals who both seek employment and hire others.

## Glossary

- **Unified_Email_System**: The authentication system that allows a single email to be associated with both candidate and company profiles
- **User_Account**: The primary authentication account linked to an email address
- **Candidate_Profile**: User profile containing job seeker information, skills, and preferences
- **Company_Profile**: User profile containing employer information, company details, and job postings
- **Role_Switching**: The ability to switch between candidate and company modes within the same session
- **Profile_Type**: Designation indicating whether a user is acting as a candidate or company at any given time
- **Firebase_Auth**: Firebase Authentication service managing user accounts
- **Firestore**: Firebase database storing user profile documents

## Requirements

### Requirement 1

**User Story:** As a user, I want to use the same email address for both my candidate and company accounts, so that I don't need to manage multiple email addresses and can easily switch between roles.

#### Acceptance Criteria

1. WHEN a user registers with an email address, THE Unified_Email_System SHALL create a single User_Account that can support both candidate and company profiles
2. WHEN a user attempts to register as a company with an email already used for a candidate account, THE Unified_Email_System SHALL link the company profile to the existing User_Account
3. WHEN a user attempts to register as a candidate with an email already used for a company account, THE Unified_Email_System SHALL link the candidate profile to the existing User_Account
4. WHEN linking profiles to an existing account, THE Unified_Email_System SHALL require password verification to ensure account ownership
5. WHEN profile linking is successful, THE Unified_Email_System SHALL maintain separate profile data for candidate and company roles

### Requirement 2

**User Story:** As a user with both candidate and company profiles, I want to easily switch between my roles, so that I can access the appropriate features and data for each context.

#### Acceptance Criteria

1. WHEN a user has both profile types, THE Role_Switching SHALL display a role selector in the application header
2. WHEN a user selects candidate mode, THE Role_Switching SHALL load the candidate dashboard and hide company-specific features
3. WHEN a user selects company mode, THE Role_Switching SHALL load the company dashboard and hide candidate-specific features
4. WHEN switching roles, THE Role_Switching SHALL preserve the user's session and not require re-authentication
5. WHEN a role is selected, THE Role_Switching SHALL update the user interface to reflect the current active profile type

### Requirement 3

**User Story:** As a user logging in, I want the system to automatically determine which profile types I have, so that I can access the appropriate interface without confusion.

#### Acceptance Criteria

1. WHEN a user logs in, THE Unified_Email_System SHALL check for both candidate and company profiles associated with the User_Account
2. WHEN only a candidate profile exists, THE Unified_Email_System SHALL direct the user to the candidate dashboard
3. WHEN only a company profile exists, THE Unified_Email_System SHALL direct the user to the company dashboard
4. WHEN both profile types exist, THE Unified_Email_System SHALL display a role selection interface or default to the last used role
5. WHEN no profiles exist, THE Unified_Email_System SHALL prompt the user to create their first profile type

### Requirement 4

**User Story:** As a user managing my account, I want to create, update, or delete either my candidate or company profile independently, so that I can maintain accurate information for each role.

#### Acceptance Criteria

1. WHEN a user accesses account settings, THE Unified_Email_System SHALL display separate sections for candidate and company profile management
2. WHEN a user creates a new profile type, THE Unified_Email_System SHALL add it to their existing User_Account without affecting the other profile
3. WHEN a user updates profile information, THE Unified_Email_System SHALL modify only the selected profile type
4. WHEN a user deletes a profile type, THE Unified_Email_System SHALL remove only that profile while preserving the other and the User_Account
5. WHEN a user deletes their last remaining profile, THE Unified_Email_System SHALL offer to delete the entire User_Account

### Requirement 5

**User Story:** As a system administrator, I want to ensure data integrity and prevent conflicts when users have multiple profile types, so that the application functions correctly and user data remains consistent.

#### Acceptance Criteria

1. WHEN storing profile data, THE Unified_Email_System SHALL maintain separate Firestore documents for candidate and company profiles linked by User_Account ID
2. WHEN a user applies for a job, THE Unified_Email_System SHALL use only candidate profile data and prevent company profile information from interfering
3. WHEN a user posts a job, THE Unified_Email_System SHALL use only company profile data and prevent candidate profile information from interfering
4. WHEN displaying user information, THE Unified_Email_System SHALL show only data relevant to the current active profile type
5. WHEN performing data operations, THE Unified_Email_System SHALL validate that actions are appropriate for the current profile type context