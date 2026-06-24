Feature: Company Management

Scenario: An administrator creates a company
Given an administrator is authenticated
When the administrator creates a company
Then the company is created
And the company belongs to the administrator

Scenario: A user cannot create a company
Given a user is authenticated
When the user attempts to create a company
Then the company is not created
