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

Scenario: An administrator links a contact to a company
Given an administrator is authenticated
And a company and a contact exist
When the contact is linked to the company
Then the contact and the company are associated

Scenario: A user cannot link a contact to a company
Given a user is authenticated
And a company and a contact exist
When the contact is linked to the company
Then the link is denied
