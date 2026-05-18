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

## Illustrations

## Roadmaps

## Authors and Acknowledgements

## License
