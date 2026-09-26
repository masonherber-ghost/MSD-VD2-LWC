
#Header 
Header and navigation logged in
Header and nav unauth
basic skinning explore for header
Mobile header skinning explore

Is slds-global-header custom? I dont see it in the design-system.

--slds-s-header-sizing-height: 80px; for desktop
.slds-global-header__item: this should align vertically centered with the main nav


Main title:
page /jobs
.slds-page-header: remove all styles. including padding, remove background, border and shadow
remove .slds-media__figure eleemnt


Buttons:
This is the design for the button component:
https://www.figma.com/design/BIYTe4aj1tFOEPvEWoBjgb/SEP---Foundations-UI-Library?node-id=11-125&m=dev
only consider the following variants:
Size=Small, State=Default, Colour=Light
Size=Small, State=Hover, Colour=Light
Size=Small, State=Active, Colour=Light
Size=Small, State=Disabled, Colour=Light
/build-from-wireframe. identify the tokens that can be used to skin the button component (text) color, background-color, hover styles, border-radius, shadow
font-size, font-weight, 



Login for 1.1

Dashboard / homepage
Fix build dashboard to have empty state

Vacancies page
Vacancy detail
Fix jobs page to have empty state

Contact page
Request support page

Send invite e-mail flow
Otp flow
Email verification flow
Auth modal - triggered from blank page for invite link

Build accept t&cs into user page (test both scenarios)