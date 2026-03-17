# Implementation Plan: Smart Water Management System

## Overview

This implementation plan breaks down the Smart Water Management System into discrete, incremental coding tasks. The system will be built using TypeScript for both frontend (React) and backend (Node.js/Express), with PostgreSQL for data persistence and Redis for real-time state management.

The implementation follows a bottom-up approach: starting with data models and core backend services, then building the API layer, and finally implementing the frontend components. Each task builds on previous work, with checkpoints to ensure stability before proceeding.

## Tasks

- [x] 1. Set up project structure and development environment
  - Initialize monorepo with separate frontend and backend packages
  - Configure TypeScript for both packages
  - Set up ESLint, Prettier, and Git hooks
  - Configure Jest and fast-check for testing
  - Create Docker Compose file for PostgreSQL and Redis
  - Set up environment variable management
  - _Requirements: All (foundational)_

- [x] 2. Implement database schema and data models
  - [x] 2.1 Create PostgreSQL schema with all tables and indexes
    - Implement users, zones, deployments, usage_records, recommendations, baselines tables
    - Create enums for zone_type, zone_status, deployment_status, recommendation_type, recommendation_status
    - Add foreign key constraints and indexes
    - _Requirements: 1.1, 2.4, 3.4, 4.1, 5.1, 6.1, 8.1_
  
  - [x] 2.2 Implement TypeScript data model interfaces and types
    - Create User, Zone, Deployment, UsageRecord, Recommendation, Baseline interfaces
    - Create corresponding enum types
    - Add validation schemas using Zod or similar
    - _Requirements: 1.1, 2.4, 3.4, 4.1, 5.1, 6.1, 8.1_
  
  - [ ]* 2.3 Write property test for zone creation round-trip
    - **Property 16: Zone Creation Persistence Round-Trip**
    - **Validates: Requirements 6.1, 6.4, 6.6**

- [x] 3. Implement authentication service
  - [x] 3.1 Create authentication service with JWT token generation
    - Implement password hashing with bcrypt
    - Create JWT token generation and verification functions
    - Implement login, logout, and token verification endpoints
    - Add rate limiting for login attempts
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 3.2 Write property test for authentication blocking
    - **Property 14: Authentication Blocks Unauthenticated Access**
    - **Validates: Requirements 5.1, 5.3**
  
  - [ ]* 3.3 Write property test for session persistence
    - **Property 15: Session Persistence**
    - **Validates: Requirements 5.5**
  
  - [ ]* 3.4 Write unit tests for authentication edge cases
    - Test invalid credentials rejection
    - Test token expiration
    - Test rate limiting behavior
    - _Requirements: 5.3, 5.6_

- [x] 4. Implement zone manager service
  - [x] 4.1 Create zone CRUD operations
    - Implement createZone, getZones, getZone, updateZone, deleteZone functions
    - Add validation for zone names (1-50 characters)
    - Enforce maximum 20 zones per user
    - Prevent deletion of zones with active deployments
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [ ]* 4.2 Write property test for zone update round-trip
    - **Property 17: Zone Update Persistence Round-Trip**
    - **Validates: Requirements 6.2, 6.6**
  
  - [ ]* 4.3 Write property test for zone deletion
    - **Property 18: Zone Deletion Removes Data**
    - **Validates: Requirements 6.3**
  
  - [ ]* 4.4 Write property test for maximum zones boundary
    - **Property 29: Maximum Zones Boundary**
    - **Validates: Requirements 6.5 (edge case)**

- [x] 5. Checkpoint - Ensure database and core services work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement water controller service
  - [x] 6.1 Create deployment management functions
    - Implement deployWater function to create deployment records
    - Implement stopDeployment function to cancel active deployments
    - Implement emergencyStop function to halt all deployments
    - Add deployment status tracking in Redis
    - _Requirements: 2.4, 2.6, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 6.2 Implement MQTT communication for IoT devices
    - Set up MQTT client connection
    - Implement command publishing to devices
    - Implement status message subscription from devices
    - Add retry logic with exponential backoff
    - Add timeout handling (30 seconds)
    - _Requirements: 2.4, 2.5, 2.6_
  
  - [ ]* 6.3 Write property test for valid deployment initiation
    - **Property 4: Valid Deployment Initiates Water Flow**
    - **Validates: Requirements 2.4**
  
  - [ ]* 6.4 Write property test for volume validation
    - **Property 3: Volume Validation Rejects Invalid Inputs**
    - **Validates: Requirements 2.3**
  
  - [ ]* 6.5 Write property tests for volume boundaries
    - **Property 27: Minimum Volume Boundary**
    - **Property 28: Maximum Volume Boundary**
    - **Validates: Requirements 2.2 (edge cases)**
  
  - [ ]* 6.6 Write property test for emergency stop
    - **Property 22: Emergency Stop Halts All Deployments**
    - **Validates: Requirements 9.2**
  
  - [ ]* 6.7 Write property test for emergency mode blocking
    - **Property 24: Emergency Mode Blocks New Deployments**
    - **Validates: Requirements 9.4**

- [x] 7. Implement usage monitor service
  - [x] 7.1 Create usage recording functions
    - Implement recordUsage function to create usage records
    - Implement getUsageHistory function with time range filtering
    - Implement getCurrentUsage function with day/week/month aggregation
    - _Requirements: 3.1, 3.2, 3.4_
  
  - [x] 7.2 Implement baseline calculation
    - Create calculateBaseline function for 30-day periods
    - Implement baseline storage and retrieval
    - _Requirements: 8.1_
  
  - [x] 7.3 Implement savings calculation
    - Create calculateSavings function comparing current to baseline
    - Calculate both volume and percentage savings
    - Add cost estimation (optional)
    - _Requirements: 3.3, 8.2, 8.3, 8.4_
  
  - [ ]* 7.4 Write property test for usage recording
    - **Property 6: Usage Recording Completeness**
    - **Validates: Requirements 3.4**
  
  - [ ]* 7.5 Write property test for usage aggregation
    - **Property 7: Usage Aggregation Accuracy**
    - **Validates: Requirements 3.1, 3.2**
  
  - [ ]* 7.6 Write property test for savings calculation
    - **Property 8: Savings Calculation Correctness**
    - **Validates: Requirements 3.3, 8.2, 8.4**
  
  - [ ]* 7.7 Write property test for baseline calculation
    - **Property 21: Baseline Calculation from Historical Data**
    - **Validates: Requirements 8.1**
  
  - [ ]* 7.8 Write property test for empty usage history
    - **Property 30: Empty Usage History Handling**
    - **Validates: Requirements 3.2, 8.2 (edge case)**

- [x] 8. Implement AI recommendation engine
  - [x] 8.1 Create recommendation generation logic
    - Implement volume optimization detection (usage > optimal * 1.2)
    - Implement anomaly detection for potential leaks
    - Implement seasonal pattern detection
    - Create recommendation objects with all required fields
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 8.2 Implement recommendation management
    - Create acceptRecommendation function to apply settings
    - Create dismissRecommendation function
    - Implement recommendation expiration logic
    - _Requirements: 4.6_
  
  - [ ]* 8.3 Write property test for recommendation generation
    - **Property 10: Recommendation Generation from Usage Patterns**
    - **Validates: Requirements 4.1, 4.3**
  
  - [ ]* 8.4 Write property test for recommendation completeness
    - **Property 11: Recommendation Completeness**
    - **Validates: Requirements 4.2, 4.4**
  
  - [ ]* 8.5 Write property test for seasonal adjustment
    - **Property 12: Seasonal Recommendation Adjustment**
    - **Validates: Requirements 4.5**
  
  - [ ]* 8.6 Write property test for recommendation acceptance
    - **Property 13: Recommendation Acceptance Applies Settings**
    - **Validates: Requirements 4.6**

- [x] 9. Checkpoint - Ensure all backend services work together
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement REST API endpoints
  - [x] 10.1 Create authentication endpoints
    - POST /api/auth/login
    - POST /api/auth/logout
    - GET /api/auth/verify
    - Add authentication middleware for protected routes
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 10.2 Create zone management endpoints
    - GET /api/zones
    - POST /api/zones
    - PUT /api/zones/:zoneId
    - DELETE /api/zones/:zoneId
    - Add request validation middleware
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 10.3 Create water control endpoints
    - POST /api/water/deploy
    - POST /api/water/stop
    - POST /api/water/emergency-stop
    - GET /api/water/status/:deploymentId
    - _Requirements: 2.4, 9.2, 9.3, 9.4_
  
  - [x] 10.4 Create usage monitoring endpoints
    - GET /api/usage/current
    - GET /api/usage/history/:zoneId
    - GET /api/usage/savings
    - _Requirements: 3.1, 3.2, 3.3, 8.2, 8.3, 8.4_
  
  - [x] 10.5 Create recommendation endpoints
    - GET /api/recommendations
    - POST /api/recommendations/:id/accept
    - POST /api/recommendations/:id/dismiss
    - _Requirements: 4.1, 4.2, 4.6_
  
  - [ ]* 10.6 Write integration tests for all API endpoints
    - Test authentication flow
    - Test zone CRUD operations
    - Test water deployment flow
    - Test usage queries
    - Test recommendation flow
    - _Requirements: All backend requirements_

- [x] 11. Implement WebSocket server for real-time updates
  - [x] 11.1 Set up Socket.io server
    - Configure WebSocket server with authentication
    - Implement subscription mechanism for zone updates
    - _Requirements: 2.5, 7.2_
  
  - [x] 11.2 Implement real-time event broadcasting
    - Broadcast deployment:progress events
    - Broadcast deployment:complete events
    - Broadcast emergency:activated events
    - Broadcast zone status changes
    - _Requirements: 2.5, 2.6, 7.2, 7.4, 9.3_
  
  - [ ]* 11.3 Write property test for deployment lifecycle tracking
    - **Property 5: Deployment Lifecycle Tracking**
    - **Validates: Requirements 2.5, 2.6, 7.4**

- [x] 12. Implement error handling and logging
  - [x] 12.1 Create error handling middleware
    - Implement consistent error response format
    - Add error logging with context
    - Implement circuit breaker for IoT communication
    - Add database transaction rollback on errors
    - _Requirements: All (error handling)_
  
  - [ ]* 12.2 Write property test for deployment failure notification
    - **Property 19: Deployment Failure Notification**
    - **Validates: Requirements 7.3**

- [x] 13. Checkpoint - Ensure backend API is complete and tested
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Set up frontend React application
  - [x] 14.1 Initialize React app with TypeScript
    - Set up Create React App or Vite
    - Configure Material-UI theme
    - Set up React Router for navigation
    - Configure Axios for API calls
    - Set up Socket.io client
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 14.2 Create authentication context and hooks
    - Implement AuthContext for global auth state
    - Create useAuth hook
    - Implement login/logout functions
    - Add protected route wrapper
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 15. Implement Dashboard component
  - [x] 15.1 Create Dashboard layout
    - Implement responsive grid layout
    - Add header with user info and logout button
    - Add emergency shutoff button (always visible)
    - Create sections for zones, usage stats, and recommendations
    - _Requirements: 1.1, 9.1, 10.4_
  
  - [x] 15.2 Implement real-time updates subscription
    - Connect to WebSocket server on mount
    - Subscribe to zone updates
    - Handle incoming real-time events
    - Update UI state on events
    - _Requirements: 2.5, 7.2_
  
  - [ ]* 15.3 Write property test for zone information display
    - **Property 1: Zone Information Completeness**
    - **Validates: Requirements 1.1, 1.4, 1.5**

- [x] 16. Implement Zone Card component
  - [x] 16.1 Create Zone Card UI
    - Display zone name, type, and status
    - Show visual indicator for active status
    - Display custom settings if present
    - Add click handler for selection
    - Implement different visual states (idle/selected/active/error)
    - _Requirements: 1.1, 1.2, 1.4, 1.5_
  
  - [ ]* 16.2 Write property test for zone selection
    - **Property 2: Zone Selection Enables Deployment Controls**
    - **Validates: Requirements 1.2, 2.1**
  
  - [ ]* 16.3 Write property test for multi-zone status display
    - **Property 20: Multi-Zone Status Display**
    - **Validates: Requirements 7.5**

- [x] 17. Implement Water Deployment Control component
  - [x] 17.1 Create deployment control UI
    - Add numeric input for water volume (1-1000 liters)
    - Add quick-select buttons (10L, 25L, 50L, 100L)
    - Add deploy button with confirmation dialog
    - Implement input validation with error messages
    - Add real-time progress bar during deployment
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 17.2 Implement deployment submission logic
    - Call API to initiate deployment
    - Handle validation errors
    - Update UI on deployment start
    - Show progress updates from WebSocket
    - Show completion notification
    - _Requirements: 2.4, 2.5, 2.6_
  
  - [ ]* 17.3 Write unit tests for deployment control
    - Test input validation
    - Test error display
    - Test progress tracking
    - _Requirements: 2.2, 2.3, 2.5_

- [x] 18. Implement Usage Monitor component
  - [x] 18.1 Create usage display UI
    - Add time range selector (day/week/month)
    - Display total usage metrics
    - Show usage by zone
    - Display savings metrics (liters and percentage)
    - _Requirements: 3.1, 3.2, 3.3, 8.2, 8.3, 8.4_
  
  - [x] 18.2 Implement usage charts
    - Create line chart for usage trends using Recharts
    - Create bar chart for zone comparison
    - Format data for visualization
    - _Requirements: 3.6, 8.5_
  
  - [ ]* 18.3 Write property test for chart data formatting
    - **Property 9: Chart Data Formatting**
    - **Validates: Requirements 3.6, 8.5**

- [x] 19. Implement AI Recommendations Panel component
  - [x] 19.1 Create recommendations display UI
    - Display list of active recommendations
    - Show recommendation type, title, and description
    - Display reasoning and estimated savings
    - Add Accept and Dismiss buttons
    - _Requirements: 4.2, 4.4_
  
  - [x] 19.2 Implement recommendation actions
    - Call API to accept recommendation
    - Call API to dismiss recommendation
    - Update UI on action completion
    - Show confirmation messages
    - _Requirements: 4.6_

- [x] 20. Implement Zone Configuration component
  - [x] 20.1 Create zone configuration UI
    - Add form for creating new zones
    - Add edit functionality for existing zones
    - Add delete confirmation dialog
    - Implement validation for zone names and limits
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  
  - [ ]* 20.2 Write unit tests for zone configuration
    - Test form validation
    - Test maximum zones limit
    - Test delete prevention for active zones
    - _Requirements: 6.3, 6.5_

- [x] 21. Implement emergency shutoff functionality
  - [x] 21.1 Create emergency shutoff button
    - Style button prominently (red, always visible)
    - Add confirmation dialog
    - Call emergency stop API
    - Show notification with stopped deployments
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 21.2 Implement emergency mode state
    - Track emergency mode in global state
    - Disable deployment controls during emergency mode
    - Add deactivation button
    - _Requirements: 9.4, 9.5_
  
  - [ ]* 21.3 Write property test for emergency stop notification
    - **Property 23: Emergency Stop Notification**
    - **Validates: Requirements 9.3**
  
  - [ ]* 21.4 Write property test for emergency mode deactivation
    - **Property 25: Emergency Mode Requires Explicit Deactivation**
    - **Validates: Requirements 9.5**

- [x] 22. Implement responsive design
  - [x] 22.1 Add responsive CSS and media queries
    - Implement mobile layout (375x667 minimum)
    - Implement tablet layout (768x1024 minimum)
    - Implement desktop layout (1024x768 minimum)
    - Test layout adaptation on viewport changes
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ]* 22.2 Write property test for responsive layout
    - **Property 26: Responsive Layout Adaptation**
    - **Validates: Requirements 10.4**

- [x] 23. Implement login page
  - [x] 23.1 Create login form UI
    - Add username and password inputs
    - Add login button
    - Display error messages for invalid credentials
    - Redirect to dashboard on successful login
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 23.2 Write unit tests for login flow
    - Test successful login
    - Test invalid credentials
    - Test redirect behavior
    - _Requirements: 5.1, 5.3_

- [x] 24. Checkpoint - Ensure frontend components work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 25. Integration and final wiring
  - [x] 25.1 Connect all components in Dashboard
    - Wire zone cards to deployment controls
    - Connect usage monitor to API
    - Connect recommendations panel to API
    - Ensure real-time updates flow correctly
    - _Requirements: All frontend requirements_
  
  - [x] 25.2 Add error handling and loading states
    - Implement loading spinners for async operations
    - Add error toast notifications
    - Implement retry mechanisms for failed requests
    - Add graceful degradation for WebSocket failures
    - _Requirements: All (error handling)_
  
  - [ ]* 25.3 Write end-to-end tests for critical flows
    - Test login → view zones → deploy water → view usage
    - Test emergency stop flow
    - Test recommendation acceptance flow
    - Test zone configuration flow
    - _Requirements: All_

- [x] 26. Final checkpoint - Complete system verification
  - Run all tests (unit, property, integration, E2E)
  - Verify all requirements are met
  - Test on different devices and browsers
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation uses TypeScript for type safety across frontend and backend
- Real-time updates use WebSocket (Socket.io) for low-latency communication
- IoT device communication uses MQTT protocol
