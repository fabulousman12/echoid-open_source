import { useEffect, useState } from "react";
import { getTemporaryRuntimeUser, subscribeTemporarySession } from "./temporarySession";

export default function useTemporarySessionUser() {
  const [user, setUser] = useState(() => getTemporaryRuntimeUser());

  useEffect(() => {
    setUser(getTemporaryRuntimeUser());
    return subscribeTemporarySession(() => {
      setUser(getTemporaryRuntimeUser());
    });
  }, []);

  return user;
}
