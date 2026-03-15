export interface User {
  id: string | null;
  name: string | null;
  username: string | null;
  token: string | null;
  status: string | null;
  bio: string | null; // new add bio
  creationDate: string | null; // new add creation date
  // need bio and creation date for the user id page to fetch the data there
}
