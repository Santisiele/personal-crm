Feature: Contact Management

Scenario: A contact is created
When a contact is created
Then the contact is stored

Scenario: Contacts are listed
Given two contacts exist
When all contacts are listed
Then both contacts are returned

Scenario: A single contact is viewed
Given a contact exists
When that contact is viewed
Then its details are returned

Scenario: Viewing a contact that does not exist
When a contact that does not exist is viewed
Then a contact-not-found error is raised
