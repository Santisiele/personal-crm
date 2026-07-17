Feature: User Management

Registration is open to anyone but never confers privilege: a self-registered
user is always a plain USER. Elevated roles are reached only by an authorized
grant (see role_assignment.feature), never at sign-up.

Scenario: Registering a user creates a plain user
When someone registers
Then the user should be stored
And the user role should be USER

Scenario: Change own password
Given a user is authenticated
When changes the password
Then the new password should be stored
And the old password should no longer be valid

Scenario: Promote a user to administrator
Given a creator is authenticated
And a user exists with role USER
When changes the user's role to ADMIN
Then the user role should be ADMIN

Scenario: Creating a user with a taken name is rejected
Given a user named "Jane Doe" already exists
When creating another user named "Jane Doe"
Then the creation is rejected as a conflict
