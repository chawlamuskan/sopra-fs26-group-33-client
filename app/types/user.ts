export interface User {
  id: string;
  name?: string;
  username: string;
  token?: string;
  status?: string;
  creationDate: string;
}

export interface Preferences {
  id: string;
  bio?: string;
  profilePicture?: string;
  visitedCountries?: string[];
  wishlistCountries?: string[];
  friends?: number[];
}