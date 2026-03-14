import React from 'react';

const Chats = ({ usersMain, history }) => {
  return (
    <div className="list-group">
      {usersMain && usersMain.length > 0 ? (
        usersMain.map(user => (
          <div key={user._id} className="list-group-item user-card d-flex justify-content-between align-items-center">
            <img src={user.avatar} alt={`${user.name}'s avatar`} className="rounded-circle" width="48" height="48" style={{ marginRight: '10px' }} />
            <div className="flex-grow-1">
              <h6 className="mb-0 user-name">{user.name}</h6>
              <small className="text-muted last-message">{user.lastMessage}</small>
            </div>
            <div className="text-right">
              {user.unreadCount > 0 && <span className="badge bg-primary">{user.unreadCount}</span>}
              <small className="text-muted timestamp d-block">{user.timestamp ? new Date(user.timestamp).toLocaleTimeString() : ''}</small>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center text-muted mt-3">
          No users found
        </div>
      )}
    </div>
  );
};

export default Chats;
