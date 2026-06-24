Feature: Token lifecycle

Scenario: A valid access token identifies its principal
Given a principal is authenticated
When an access token is issued for that principal
Then verifying the access token yields the same principal

Scenario: An expired access token is rejected
Given a principal is authenticated
And the access token lifetime is zero
When an access token is issued for that principal
Then verifying the access token is rejected as unauthenticated

Scenario: A tampered access token is rejected
Given a principal is authenticated
When an access token is issued for that principal
Then verifying a tampered access token is rejected as unauthenticated

Scenario: A refresh token mints a fresh access token
Given a principal is authenticated
When a refresh token is issued for that principal
And the refresh token is exchanged for a new access token
Then verifying the new access token yields the same principal

Scenario: An expired refresh token is rejected on exchange
Given a principal is authenticated
And the refresh token lifetime is zero
When a refresh token is issued for that principal
And the refresh token is exchanged for a new access token
Then the exchange is rejected as unauthenticated

Scenario: An access token cannot be used as a refresh token
Given a principal is authenticated
When an access token is issued for that principal
And the access token is exchanged for a new access token
Then the exchange is rejected as unauthenticated
