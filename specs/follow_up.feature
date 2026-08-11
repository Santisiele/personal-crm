Feature: Follow-up board

The follow-up board shows one row per task the actor may see (owner, assignee or
privileged), with its next step, ordered by the next-action date so the most
urgent is on top. When a task has a logged activity, its next step drives the
row; otherwise the row falls back to the task's own due date and title.

Scenario: The board lists visible tasks ordered by next action, soonest first
Given a user is authenticated
And the user owns a task due 2026-03-01 and another due 2026-01-15
When the user views the follow-up board
Then two rows are returned, the 2026-01-15 one first

Scenario: A row falls back to the task's due date and title without activity
Given a user is authenticated
And the user owns a task titled "Call the client" due 2026-05-10 with no activity
When the user views the follow-up board
Then the row's next action is "Call the client" on 2026-05-10

Scenario: A logged activity's next step drives the row
Given a user is authenticated
And the user owns a task with an activity planning to meet on 2026-06-20
When the user views the follow-up board
Then the row's next action reflects that plan

Scenario: A user does not see another user's task on the board
Given a user is authenticated
And a task belongs to another user
When the user views the follow-up board
Then the board has no rows

Scenario: A privileged actor sees every task on the board
Given an administrator is authenticated
And a task belongs to one user and another to a different user
When the administrator views the follow-up board
Then both tasks appear on the board
