const stubAuth = () => {
  cy.intercept("POST", "**/user/refresh", {
    statusCode: 200,
    body: { authtoken: "test-token", refreshToken: "test-refresh" }
  }).as("refreshToken");

  cy.intercept("POST", "**/user/getuser", {
    statusCode: 200,
    body: { success: true, userResponse: { _id: "u1", name: "Test User" } }
  }).as("getUser");

  cy.intercept("POST", "**/user/updateKey", {
    statusCode: 200,
    body: { success: true }
  }).as("updateKey");
};

const visitAdminChat = () => {
  cy.visit("/AdminChat", {
    onBeforeLoad(win) {
      win.localStorage.setItem("token", "test-token");
      win.localStorage.setItem("refreshToken", "test-refresh");
    }
  });

  cy.window().then(async (win) => {
    if (win.storageReady) await win.storageReady;
  });
};

describe("Admin Chat", () => {
  it("loads admin messages and sends a new message", () => {
    stubAuth();

    cy.intercept("GET", "**/message/messages*", {
      statusCode: 200,
      body: {
        messages: [
          {
            _id: "m1",
            sender: "admin",
            content: "Hello from admin",
            timestamp: 1000,
            read: false
          }
        ]
      }
    }).as("getAdminMessages");

    cy.intercept("POST", "**/admin/send", (req) => {
      expect(req.body).to.deep.equal({ content: "Hi admin" });
      req.reply({ statusCode: 200, body: { success: true } });
    }).as("sendAdminMessage");

    visitAdminChat();

    cy.window().then((win) => {
      win.storage.setItem("admin_messages_cache", JSON.stringify([]));
    });

    cy.get('button[title="Refresh messages"]').click();
    cy.wait("@getAdminMessages");

    cy.contains("Hello from admin").should("be.visible");

    cy.get('input[placeholder="Type your message..."]').type("Hi admin");
    cy.contains("button", "Send").click();

    cy.wait("@sendAdminMessage");
    cy.contains("Hi admin").should("be.visible");
  });

  it("uses afterId on refresh when cache exists", () => {
    stubAuth();

    cy.intercept("GET", "**/message/messages*", {
      statusCode: 200,
      body: { messages: [] }
    }).as("initialAdminMessages");

    visitAdminChat();

    cy.window().then((win) => {
      win.storage.setItem(
        "admin_messages_cache",
        JSON.stringify([
          {
            _id: "last-id",
            sender: "admin",
            content: "Cached",
            timestamp: 123,
            read: false
          }
        ])
      );
    });

    cy.intercept("GET", "**/message/messages*", (req) => {
      expect(req.url).to.include("afterId=last-id");
      req.reply({ statusCode: 200, body: { messages: [] } });
    }).as("refreshAdminMessages");

    cy.get('button[title="Refresh messages"]').click();
    cy.wait("@refreshAdminMessages");
  });
});
