Feature: Reason for appeal
  In order to give my reason for appeal
  As a citizen
  I want to be able to fill in the reason text field

  Scenario: Navigate through reasons for appeal
    Given I am authenticated as a valid appellant
    When I visit reasons for appeal
    And I click "Save and continue" button
    Then I should see error summary

    When I click "Save for later" button
    Then I should see error summary

#    When I click the back button on reasons for appeal
#    Then I should be taken to the appellant timeline

    When I visit the "REASONS_FOR_APPEAL" page
    Then I enter "A description of why I think the appeal is wrong" into the reason for appeal text box and click Save and Continue
    Then I should see the "ADDITIONAL_SUPPORTING_EVIDENCE" page

    When I click "Continue" button
    Then I should see error summary

    When I select "Yes"
    And I click "Continue" button
    Then I should see the "SUPPORTING_EVIDENCE_UPLOAD" page

    Then I click "Upload file" button
    Then I should see error summary

    When I choose a file that is "INVALID_TOO_BIG"
    Then I click "Upload file" button
    Then I should see error summary

    When I choose a file that is "INVALID_FORMAT"
    Then I click "Upload file" button
    Then I should see error summary

    When I choose a file that is "VALID"
    Then I click "Upload file" button
    And I click "Save and continue" button
    Then I should see the "REASONS_FOR_APPEAL_CHECK_YOUR_ANSWERS" page

