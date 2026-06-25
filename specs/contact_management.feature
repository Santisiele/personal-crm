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

Scenario: A contact is edited
Given a contact exists
When the contact's name and email are changed
Then the stored contact reflects the changes

Scenario: A partial edit leaves untouched fields intact
Given a contact exists
When only the contact's email is changed
Then the stored contact keeps its original name and birth

Scenario: Editing a contact that does not exist
When a contact that does not exist is edited
Then a contact-not-found error is raised

Scenario: A contact is deleted and no longer listed
Given a contact exists
When that contact is deleted
Then the contact is not in the listing

Scenario: A deleted contact can still be viewed by id
Given a contact exists
When that contact is deleted
Then the contact can still be viewed by id

Scenario: Deleting a contact that does not exist
When a contact that does not exist is deleted
Then a contact-not-found error is raised
