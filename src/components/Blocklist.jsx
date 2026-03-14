import { useHistory } from "react-router-dom";
import { BiArrowBack } from "react-icons/bi";
export default function BlockedUsers({ usersMain, blockedUsers,blockUser,unblockUser }) {
  const history = useHistory();

  const blockedUserList = usersMain.filter(u =>
    blockedUsers.has(u.id)
  );

  

  return (
    <div className="h-screen  text-white flex flex-col" style={{backgroundColor :'#1e293b'}}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
        <button
          onClick={() => history.goBack()}
          className="text-lg"
        >
      <BiArrowBack />

        </button>
        <h1 className="text-lg font-semibold">Blocked users</h1>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {blockedUserList.length === 0 && (
          <p className="text-center text-gray-400 mt-10">
            No blocked users
          </p>
        )}

        {blockedUserList.map(user => {
          const isBlocked = blockedUsers.has(user.id);

          return (
            <div
              key={user.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-gray-900"
            >
              {/* Avatar */}
              <img
                src={user.avatar}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover"
              />

              {/* Name + phone */}
              <div className="flex-1">
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-400">
                  {user.phoneNumber}
                </p>
              </div>

              {/* Action button */}
              {isBlocked ? (
                <button
                  onClick={() => unblockUser(user.id)}
                  className="px-3 py-1 text-sm rounded-lg bg-green-600 hover:bg-green-700 transition"
                >
                  Unblock
                </button>
              ) : (
                <button
                  onClick={() => blockUser(user.id)}
                  className="px-3 py-1 text-sm rounded-lg bg-red-600 hover:bg-red-700 transition"
                >
                  Block
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
