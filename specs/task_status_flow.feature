Feature: Task Status Flow

Scenario: A new task starts in the pending status
Given a user is authenticated
When the user creates a task
Then the task status is pending

Scenario: Owner moves their task through the status flow
Given a user is authenticated
And the task belongs to that user
When the user changes the task status to in progress
Then the task status is in progress

Scenario: Assignee can change the status of a task assigned to them
Given a user is authenticated
And a task is assigned to that user
When the user changes the task status to done
Then the task status is done

Scenario: A user cannot change the status of someone else's task
Given a user is authenticated
And a task belongs to another user
When the user attempts to change the task status
Then changing the status is denied
