export interface User {
  id: string;
  name: string | null;
  username: string;
  token: string | null;
  status: string | null;
  bio: string | null;
  creationDate: string;
  profilePicture: string | null;
  countriesVisited: string[] | null;
  countriesWishlist: string[] | null;
  friends: string[] | null;
}