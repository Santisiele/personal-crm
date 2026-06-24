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

Scenario: Listing the companies
Given an administrator is authenticated
And two companies exist
When the companies are listed
Then both companies are returned

Scenario: Viewing a company with its linked contacts
Given an administrator is authenticated
And a company with a linked contact exists
When the company is viewed
Then the company is returned with its linked contact

Scenario: Viewing a company that does not exist
Given an administrator is authenticated
When a non-existent company is viewed
Then the company is reported as not found

Scenario: An administrator edits a company
Given an administrator is authenticated
And a company exists
When the administrator edits the company name
Then the company reflects the new name

Scenario: A user cannot edit a company
Given a user is authenticated
And a company exists
When the user attempts to edit the company name
Then the edit is denied

Scenario: An administrator changes a company status
Given an administrator is authenticated
And a company exists
When the administrator changes the company status
Then the company reflects the new status

Scenario: A user cannot change a company status
Given a user is authenticated
And a company exists
When the user attempts to change the company status
Then the status change is denied
