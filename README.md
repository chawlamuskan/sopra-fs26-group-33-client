# 🌍 Worldtura Information

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
Moving to own branch
```bash
git checkout your-branch-name
```
State changes
```bash
git add .
```
Commit changes
```bash
git commit -m “Description of changes”
```
Pushing branch to remote

```bash
git push origin your-branch-name
```


## Illustrations

## Roadmaps

## Authors and Acknowledgements

## License
