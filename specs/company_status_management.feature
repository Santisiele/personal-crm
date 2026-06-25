Feature: Company Status Management

Scenario: A creator creates a company status
Given a creator is authenticated
When the creator creates a company status
Then the company status is created

Scenario: A user cannot create a company status
Given a user is authenticated
When the user attempts to create a company status
Then the company status is not created

Scenario: Creating a duplicate company status
Given a creator is authenticated
And a company status already exists
When the creator creates the same company status
Then the creation is rejected as a conflict

Scenario: A creator lists the company statuses
Given a creator is authenticated
And two company statuses exist
When the company statuses are listed
Then both company statuses are returned
