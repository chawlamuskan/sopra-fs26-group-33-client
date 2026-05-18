# 🌍 Worldtura Information - Client Side

Travel planning can be overwhelming, with information scattered across multiple websites and
platforms, making it hard to find reliable tips and personalized recommendations. Our project
aims to create an interactive and collaborative web application that centralizes travel information while encouraging community contributions. Users explore destinations through an
interactive world map, they can create and share travel boards, plan itineraries, and discover popular or highly rated places.


## Technologies Used

## High-Level Components

Our project has a few main components that make up the majority of the user experience. 

### Map:
The map is one of the app’s core features and serves as the first page users interact with, either as logged-out users  [(see page)](https://github.com/chawlamuskan/sopra-fs26-group-33-client/blob/aff108930eb840b1761b111e6bb32dc571a796b9/app/page.tsx) or after registering/logging in [(see page)](https://github.com/chawlamuskan/sopra-fs26-group-33-client/blob/aff108930eb840b1761b111e6bb32dc571a796b9/app/users/%5Bid%5D/page.tsx).
The map uses the [Google Maps API](https://mapsplatform.google.com/lp/maps-apis/) for the rendering of the map, the [REST Countries API](https://restcountries.com/) to fetch the information about the individual countries for their respective popups, and the [Google Places API](https://developers.google.com/maps/documentation/places/web-service/overview) to fetch the information regarding individual places. 
The page also communicates extensively with the backend. Its primary backend interactions include saving places, retrieving existing travel boards, and managing the relationship between saved locations and user-generated travel content. 

### Saved Places:
The Saved Places page contains all locations that the user has saved from the map [(see page)](https://github.com/chawlamuskan/sopra-fs26-group-33-client/blob/aff108930eb840b1761b111e6bb32dc571a796b9/app/places/page.tsx). 
Places are organised into categories, based on the ones provided by the [Google Places API](https://developers.google.com/maps/documentation/places/web-service/overview). This page communicates with the database to fetch the places saved by the logged in user, and to remove places from the saved list. 



## Launch & Deployment 

To be able to work on this directory locally, developers should first clone the repository using either HTTPS or SSH:

**HTTPS**: 
```bash
git clone https://github.com/chawlamuskan/sopra-fs26-group-33-client.git
```
**SSH**: 
```bash
git clone git@github.com:chawlamuskan/sopra-fs26-group-33-client.git
```
### Installing dependencies:
Developers should make sure to have the latest version of Node.js installed. 
Required dependencies can be installed using the command 
```bash
npm install
```
### External services:
This project relies on the following external APIs:
- Google Maps API (map rendering)
- Google Places API (place data)
- REST Countries API (country information)

### Setting up local environment:
Developers must configure API keys in environment variables (e.g. `.env.local`), such as:
```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here 
```
### Running the client locally
The client can run locally with the following command:
```bash
npm run dev
```
And it will be accessible on the link [http://localhost:3000/](http://localhost:3000/) 

### Backend dependency
This application communicates with a backend service responsible for:
- User authentication
- Saving and retrieving saved places
- Managing travel boards

The backend must be running locally or accessible via a configured API endpoint in environment variables. For more information on setting up the server, readers should refer to the [README of the server directory](https://github.com/chawlamuskan/sopra-fs26-group-33-server/blob/855ebcd724ef9f865a163ada4145ff5ce00c175e/README.md).

### Committing changes
The project followed a branch workflow. Each team member worked on a dedicated branch and pushed changes there first. Once a feature or fix was completed, a pull request (PR) was created to merge the changes into the main branch.
All pull requests were reviewed by at least one other team member before being merged, ensuring code quality and consistency across the project.  

Typical workflow: 

- Moving to own branch
```bash
git checkout your-branch-name
```
- State changes
```bash
git add .
```
- Commit changes
```bash
git commit -m “Description of changes”
```
- Pushing branch to remote

```bash
git push origin your-branch-name
```


## Illustrations


This section describes the main user flows of the application. The map serves as the central entry point, from which users navigate to different features such as saved places, travel boards, and community interactions. 

### Logged out users

#### Map:
Logged-out users can explore a simplified 2D map displaying only the main geographical features. By clicking on a country, they can access an overview containing basic statistics and information about that country. 

#### Registration and Preferences: 
New users can register with the dedicated page. After signing up, they are prompted to set up their profile preferences, which include:

- Writing a bio
- Selecting a profile picture
- Choosing countries they have visited or want to visit
- Adding friends by username

These steps are optional and can be skipped or completed later via the Settings page.

### Logged in users

#### Login: 

Users can login with their username or email, and their password. 
After login, the map becomes the home page. Navigation to other pages is available via the user profile icon in the top-right corner. The Worldtura logo redirects users back to the main map view.

#### Map:
Logged-in users have access to a more interactive experience. In addition to the country overview, users can view popular places within the app that are located in the selected country. As users zoom in, individual landmarks, establishments, and attractions become visible on the map. 
Clicking on a place opens a pop-up containing details such as the address, with options to:

- Save the place
- Add it to a travel board
- View public travel boards containing the place

A search bar allows users to find specific locations. Additionally, a “Saved Places Mode” toggle displays all saved places on the map using emoji-based category markers.

#### Country Overview
This page shows the user’s visited and “want to visit” countries on a simplified world map, while all other countries are displayed in grey.

Clicking on a country opens a pop-up similar to the main map overview. However, instead of popular places, it displays travel boards associated with that country.

#### Saved Places
This page displays all places saved by the user, organized into categories (plus an “All” category).

Only up to 9 places are shown per category, with a “See more” option to view the full list. Inside the full view, users can also remove saved places.

#### Travel Boards
This page allows users to create, manage, and join travel boards. 

**Creating a board:**

Users can create a board via a pop-up form where they must provide a name and location, and optionally select a date range. Boards can be set to one of three privacy levels:

- Private (only owner and members can view)
- Friends (friends of the owner can also view)
- Public (visible to all users)

Users can also invite others either via a generated code or directly (if they are friends).

**Managing boards:**

In “Manage Mode”, users can rename or delete boards they own, and leave boards they are members of. Changes are finalized by clicking “Done”. 

**Joining a board:**

Users receive invitations via notifications accessible from the bell icon in the header. Alternatively, they can join using an invitation code. 

#### Individual Travel Board
Selecting a travel board opens its dedicated page, which displays:

- Board name
- Member profile pictures
- Selected date range (if applicable)

The page is divided into two sections:

- Saved places
- Activity log

Places can be added either from the map or via the “Add a place” option in Saved Places. This opens a filtered view showing relevant places based on location. Non-matching places are greyed out, but can still be added with confirmation.

Places can be removed individually, triggering a confirmation step.

All updates are reflected in real time in the activity log, allowing all members to track changes within the board.

#### Community
The Community page is split into two tabs: 

**Friends tab**
Displays friends’ profiles and their travel boards, unless those boards are set to private. 

**Public tab**
Displays all public travel boards. Users can view these boards in guest mode, where editing is disabled, and can request to join them. 

#### Profile Settings
In this page, users can update:

- Profile information and preferences
- Password
- Friends list

Users can also delete their account. In this case, all associated data, including saved places and travel boards, is permanently removed.


## Roadmaps

## Authors and Acknowledgements

## License
