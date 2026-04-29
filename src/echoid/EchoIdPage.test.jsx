import React from "react";
import { act, fireEvent, render, within } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Swal from "sweetalert2";
import EchoIdPage from "./EchoIdPage";
import { api } from "../services/api";

vi.mock("lucide-react", () => {
  const Icon = () => <span data-testid="icon" />;
  return {
    ArrowLeft: Icon,
    Bell: Icon,
    ChevronRight: Icon,
    CircleUserRound: Icon,
    Compass: Icon,
    Filter: Icon,
    Home: Icon,
    Image: Icon,
    Menu: Icon,
    MessageSquarePlus: Icon,
    Search: Icon,
    Sparkles: Icon,
    TriangleAlert: Icon,
    Video: Icon,
  };
});

vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn(),
  },
}));

vi.mock("../services/api", () => ({
  api: {
    anonymousMe: vi.fn(),
    getAnonymousUser: vi.fn(),
    anonymousUserByUsername: vi.fn(),
    postFeed: vi.fn(),
    postSearch: vi.fn(),
    postById: vi.fn(),
    postReactionsBatch: vi.fn(),
    postLike: vi.fn(),
    postDislike: vi.fn(),
    postWitness: vi.fn(),
    postUnwitness: vi.fn(),
    postWitnesses: vi.fn(),
    postDelete: vi.fn(),
    postReport: vi.fn(),
    postComments: vi.fn(),
    postCommentReplies: vi.fn(),
    createPostComment: vi.fn(),
    postMyPosts: vi.fn(),
    postByClientId: vi.fn(),
    postUploadInit: vi.fn(),
    postUploadDelete: vi.fn(),
    createPost: vi.fn(),
  },
}));

vi.mock("../services/anonymousProfileStorage", () => ({
  readAnonymousProfile: vi.fn(() => ({
      name: "Echo Tester",
      username: "echo.tester",
      about: "Testing EchoId",
      clientId: "507f1f77bcf86cd799439011",
      profilePic: "",
      trustScore: 8,
    })),
  saveAnonymousProfile: vi.fn(),
  clearAnonymousProfile: vi.fn(),
}));

vi.mock("../pages/StarLoader", () => ({
  default: () => <div>Loading...</div>,
}));

const jsonResponse = (payload, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  });

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  api.anonymousMe.mockResolvedValue(jsonResponse({
    success: true,
    userResponse: {
      name: "Echo Tester",
      username: "echo.tester",
      about: "Testing EchoId",
      clientId: "507f1f77bcf86cd799439011",
      profilePic: "",
      trustScore: 8,
    },
  }));
  api.getAnonymousUser.mockResolvedValue(jsonResponse({
    success: true,
    userResponse: {
      clientId: "507f1f77bcf86cd799439099",
      name: "Kaddu Core",
      username: "kaddu.core",
      about: "Testing anonymous profiles",
      profilePic: "",
      createdAt: new Date().toISOString(),
    },
  }));
  api.anonymousUserByUsername.mockResolvedValue(jsonResponse({ success: true, userResponse: [] }));
  api.postFeed.mockResolvedValue(jsonResponse({ success: true, posts: [] }));
  api.postSearch.mockResolvedValue(jsonResponse({ success: true, posts: [] }));
  api.postById.mockResolvedValue(jsonResponse({ success: true, post: null }, 404));
  api.postReactionsBatch.mockResolvedValue(jsonResponse({ success: true, reactions: [] }));
  api.postLike.mockResolvedValue(jsonResponse({ success: true, likes: 0, dislikes: 0 }));
  api.postDislike.mockResolvedValue(jsonResponse({ success: true, likes: 0, dislikes: 0 }));
  api.postWitness.mockResolvedValue(jsonResponse({ success: true, witness: 1 }));
  api.postUnwitness.mockResolvedValue(jsonResponse({ success: true, witness: 0 }));
  api.postWitnesses.mockResolvedValue(jsonResponse({ success: true, witnesses: [] }));
  api.postDelete.mockResolvedValue(jsonResponse({ success: true, deleted: true }));
  api.postReport.mockResolvedValue(jsonResponse({ success: true }));
  api.postComments.mockResolvedValue(jsonResponse({ success: true, comments: [] }));
  api.postCommentReplies.mockResolvedValue(jsonResponse({ success: true, comments: [] }));
  api.createPostComment.mockResolvedValue(
    jsonResponse({
      success: true,
      comment: {
        _id: "comment-new",
        name: "Echo Tester",
        username: "echo.tester",
        userProfile: "",
        body: "Hello",
        createdAt: new Date().toISOString(),
      },
      comments: 1,
    })
  );
  api.postMyPosts.mockResolvedValue(jsonResponse({ success: true, posts: [] }));
  api.postByClientId.mockReset();
  api.postUploadInit.mockReset();
  api.postUploadDelete.mockReset();
  api.createPost.mockReset();
  Swal.fire.mockResolvedValue({ isConfirmed: true, value: "spam" });
});

test("switches tabs and filters local post search results", () => {
  vi.useFakeTimers();
  const { container, getByText, getByLabelText, getAllByText, getAllByLabelText, queryByText } = render(
    <MemoryRouter>
      <EchoIdPage />
    </MemoryRouter>
  );

  expect(getByText("Signals moving through the city right now.")).toBeTruthy();
  expect(getByText("5 min ago")).toBeTruthy();
  expect(getByText("I kept quiet when the block lights failed")).toBeTruthy();
  expect(getByText("Observed a low-glow pulse across the downtown grid. Tracking the light trail before it folds back into the sky...")).toBeTruthy();
  expect(getByText("Likes 19")).toBeTruthy();
  expect(getByText("Comments 8")).toBeTruthy();
  expect(getAllByText("Dislikes 0").length).toBeGreaterThan(0);
  expect(queryByText("Witness 0")).toBeNull();

  fireEvent.click(getAllByLabelText("Open sort options")[0]);
  const sortMenu = getAllByLabelText("Sort options")[1];
  expect(within(sortMenu).getByText("By date")).toBeTruthy();
  fireEvent.click(within(sortMenu).getByText("By least popularity"));

  const homeAuthors = Array.from(container.querySelectorAll(".echoid-post-card h3")).map((node) => node.textContent);
  expect(homeAuthors[0]).toBe("cityline_watch");

  fireEvent.click(getByText("Search"));
  const searchInput = getByLabelText("Search EchoId");
  expect(getByText("To search user type with @, and for post just texts.")).toBeTruthy();
  expect(getByText("Start typing to search.")).toBeTruthy();
  expect(queryByText("Ward promises keep changing after every meeting")).toBeNull();

  fireEvent.change(searchInput, { target: { value: "streetlight" } });

  expect(queryByText("Streetlight outage outside sector nine crossing")).toBeNull();
  act(() => {
    vi.advanceTimersByTime(250);
  });
  expect(getByText("Streetlight outage outside sector nine crossing")).toBeTruthy();
  expect(getByText("Witness 31")).toBeTruthy();
  expect(queryByText("Trust score 8")).toBeNull();

  fireEvent.click(getAllByLabelText("Open menu")[0]);
  fireEvent.click(getByText("Create Echo"));
  expect(getByText("Broadcast a new post to your field.")).toBeTruthy();
  expect(getByText("Preview Echo")).toBeTruthy();
  vi.useRealTimers();
});

test("searches users from backend by username and renders anonymous profile fields", async () => {
  api.anonymousUserByUsername.mockResolvedValue(
    jsonResponse({
      success: true,
      userResponse: [
        {
          clientId: "507f1f77bcf86cd799439099",
          name: "Kaddu Lover",
          username: "kaddu_lover",
          trustScore: 8,
          about: "Tracks city patterns quietly.",
          profilePic: "https://cdn.example.com/cipher.png",
        },
        {
          clientId: "507f1f77bcf86cd799439098",
          name: "Kaddu Core",
          username: "kaddu.core",
          trustScore: 5,
          about: "",
          profilePic: "",
        },
      ],
    })
  );

  const { getByText, getByLabelText, findByText, queryByText } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  fireEvent.click(getByText("Search"));
  fireEvent.change(getByLabelText("Search EchoId"), { target: { value: "@kaddu" } });

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
  });

  expect(await findByText("Kaddu Lover")).toBeTruthy();
  expect(getByText("@kaddu_lover")).toBeTruthy();
  expect(getByText("Trust score 8")).toBeTruthy();
  expect(getByText("Tracks city patterns quietly.")).toBeTruthy();
  expect(getByText("Kaddu Core")).toBeTruthy();
  expect(getByText("@kaddu.core")).toBeTruthy();
  expect(queryByText("Age 24")).toBeNull();
  expect(queryByText(/Client ID/i)).toBeNull();
  expect(queryByText(/Profile URL/i)).toBeNull();
  expect(api.anonymousUserByUsername).toHaveBeenCalledWith("https://api.example.com", "kaddu");
});

test("opens user details from search results and loads public posts", async () => {
  api.anonymousUserByUsername.mockResolvedValue(
    jsonResponse({
      success: true,
      userResponse: [
        {
          clientId: "507f1f77bcf86cd799439099",
          name: "Kaddu Lover",
          username: "kaddu_lover",
          trustScore: 8,
          about: "Tracks city patterns quietly.",
          profilePic: "",
        },
      ],
    })
  );
  api.getAnonymousUser.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      userResponse: {
        clientId: "507f1f77bcf86cd799439099",
        name: "Kaddu Lover",
        username: "kaddu_lover",
        about: "Tracks city patterns quietly.",
        profilePic: "",
        createdAt: new Date().toISOString(),
      },
    })
  );
  api.postByClientId.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      posts: [
        {
          _id: "user-post-1",
          posterId: "507f1f77bcf86cd799439099",
          name: "Kaddu Lover",
          username: "kaddu_lover",
          createdAt: new Date().toISOString(),
          category: "story",
          title: "User post",
          body: "Public body [Link:-https://cdn.example.com/p.png]",
          likes: 1,
          comments: 0,
          witness: 0,
        },
      ],
    })
  );

  const { getByText, getByLabelText, findByText } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  fireEvent.click(getByText("Search"));
  fireEvent.change(getByLabelText("Search EchoId"), { target: { value: "@kaddu" } });

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
  });

  fireEvent.click(await findByText("Kaddu Lover"));

  expect(await findByText("Load posts")).toBeTruthy();
  expect(getByText("@kaddu_lover")).toBeTruthy();

  fireEvent.click(getByText("Load posts"));

  expect(await findByText("User post")).toBeTruthy();
  expect(getByText("Public body")).toBeTruthy();
  expect(api.getAnonymousUser).toHaveBeenCalledWith("https://api.example.com", "507f1f77bcf86cd799439099");
  expect(api.postByClientId).toHaveBeenCalledWith("https://api.example.com", "507f1f77bcf86cd799439099");
});

test("profile shows trust score and renders own posts with moderation details", async () => {
  api.postMyPosts.mockResolvedValue(
    jsonResponse({
      success: true,
      posts: [
        {
          _id: "mine-1",
          name: "Echo Tester",
          username: "echo.tester",
          createdAt: new Date().toISOString(),
          category: "confessions",
          subCategory: "confession formal",
          title: "My hidden post",
          body: "body [Link:-https://cdn.example.com/a.png]",
          coverImage: "https://cdn.example.com/a.png",
          likes: 2,
          comments: 1,
          witness: 0,
          visibility: "hidden",
          moderationScore: 6,
          expire: "2026-05-01T10:30:00.000Z",
        },
      ],
    })
  );

  const { getByText, findByText } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  fireEvent.click(await findByText("Profile"));

  expect(await findByText("Trust score")).toBeTruthy();
  expect(getByText("8")).toBeTruthy();
  expect(getByText("Your posts")).toBeTruthy();
  expect(getByText("My hidden post")).toBeTruthy();
  expect(getByText("Hidden")).toBeTruthy();
  expect(getByText("Moderation 6")).toBeTruthy();
  expect(getByText(/Expires /)).toBeTruthy();
  expect(getByText("body")).toBeTruthy();
  expect(api.postMyPosts).toHaveBeenCalledWith("https://api.example.com");
});

test("owner can open witness panel from post detail and remove a witness", async () => {
  api.postMyPosts.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      posts: [
        {
          _id: "mine-politics-1",
          posterId: "507f1f77bcf86cd799439011",
          name: "Echo Tester",
          username: "echo.tester",
          createdAt: new Date().toISOString(),
          category: "politics",
          title: "Owner witness post",
          body: "body",
          likes: 2,
          comments: 1,
          witness: 2,
          visibility: "normal",
        },
      ],
    })
  );
  api.postWitnesses.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      witnesses: [
        {
          clientId: "507f1f77bcf86cd799439099",
          name: "Civic Friend",
          username: "civic.friend",
          profilePic: "",
        },
      ],
    })
  );
  api.postById.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      post: {
        _id: "mine-politics-1",
        posterId: "507f1f77bcf86cd799439011",
        name: "Echo Tester",
        username: "echo.tester",
        createdAt: new Date().toISOString(),
        category: "politics",
        title: "Owner witness post",
        body: "body",
        likes: 2,
        comments: 1,
        witness: 2,
      },
    })
  );
  api.postUnwitness.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      witness: 1,
    })
  );

  const { findByText, findAllByRole, getByText, getByRole, getAllByRole } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  fireEvent.click(await findByText("Profile"));
  fireEvent.click(await findByText("Owner witness post"));

  const witnessButtons = await findAllByRole("button", { name: /Witnesses 2/i });
  fireEvent.click(witnessButtons[0]);

  expect(await findByText("Witnesses")).toBeTruthy();
  expect(getByText("Civic Friend")).toBeTruthy();

  fireEvent.click(getAllByRole("button", { name: "Delete" })[1]);

  expect(api.postWitnesses).toHaveBeenCalledWith("https://api.example.com", "mine-politics-1");
  expect(api.postUnwitness).toHaveBeenCalledWith("https://api.example.com", "mine-politics-1", {
    clientId: "507f1f77bcf86cd799439011",
    targetClientId: "507f1f77bcf86cd799439099",
  });
});

test("home category navigation updates feed query and appends paginated posts on scroll", async () => {
  api.postFeed
    .mockResolvedValueOnce(
      jsonResponse({
        success: true,
        page: 1,
        hasMore: false,
        posts: [],
      })
    )
    .mockResolvedValueOnce(
      jsonResponse({
        success: true,
        page: 1,
        hasMore: true,
        posts: [
          {
            _id: "politics-1",
            name: "policy_watch",
            username: "policy.watch",
            createdAt: new Date().toISOString(),
            category: "politics",
            subCategory: "",
            title: "Ward update one",
            body: "First politics page",
            likes: 5,
            comments: 1,
            reports: 0,
            witness: 2,
            coverImage: "",
          },
        ],
      })
    )
    .mockResolvedValueOnce(
      jsonResponse({
        success: true,
        page: 2,
        hasMore: false,
        posts: [
          {
            _id: "politics-2",
            name: "policy_watch_two",
            username: "policy.watch.two",
            createdAt: new Date(Date.now() - 1000).toISOString(),
            category: "politics",
            subCategory: "",
            title: "Ward update two",
            body: "Second politics page",
            likes: 3,
            comments: 0,
            reports: 0,
            witness: 1,
            coverImage: "",
          },
        ],
      })
    );

  const { getAllByText, getByText, findByText, container } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  fireEvent.click(getAllByText("Politics").find((node) => node.tagName === "BUTTON"));

  expect(await findByText("Ward update one")).toBeTruthy();
  expect(
    api.postFeed.mock.calls.some(
      ([host, params]) =>
        host === "https://api.example.com" &&
        params?.filter === "time" &&
        params?.page === 1 &&
        params?.category === "politics"
    )
  ).toBe(true);

  const content = container.querySelector(".echoid-content");
  Object.defineProperty(content, "scrollHeight", { value: 1000, configurable: true });
  Object.defineProperty(content, "clientHeight", { value: 400, configurable: true });
  Object.defineProperty(content, "scrollTop", { value: 700, configurable: true, writable: true });

  fireEvent.scroll(content);

  expect(await findByText("Ward update two")).toBeTruthy();
  expect(
    api.postFeed.mock.calls.some(
      ([host, params]) =>
        host === "https://api.example.com" &&
        params?.filter === "time" &&
        params?.page === 2 &&
        params?.category === "politics"
    )
  ).toBe(true);
});

test("batches reactions and witness marks for fetched posts and updates filled state after toggles", async () => {
  api.postFeed.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      page: 1,
      hasMore: false,
      posts: [
        {
          _id: "post-1",
          name: "policy_watch",
          username: "policy.watch",
          createdAt: new Date().toISOString(),
          category: "politics",
          title: "Ward update one",
          body: "First politics page",
          likes: 5,
          dislikes: 1,
          comments: 1,
          reports: 0,
          witness: 2,
          coverImage: "",
        },
      ],
    })
  );
  api.postReactionsBatch.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      reactions: [{ postId: "post-1", value: -1 }],
      witnesses: [{ postId: "post-1", value: 1 }],
    })
  );
  api.postLike.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      likes: 6,
      dislikes: 0,
    })
  );
  api.postUnwitness.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      witness: 1,
    })
  );

  const { findByText, getByRole } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  expect(await findByText("Ward update one")).toBeTruthy();
  expect(api.postReactionsBatch).toHaveBeenCalledWith("https://api.example.com", {
    clientId: "507f1f77bcf86cd799439011",
    postIds: ["post-1"],
    witnessPostIds: ["post-1"],
  });

  const dislikeButton = getByRole("button", { name: /Dislikes 1/i });
  expect(dislikeButton.getAttribute("aria-pressed")).toBe("true");
  const witnessButton = getByRole("button", { name: /Witness 2/i });
  expect(witnessButton.getAttribute("aria-pressed")).toBe("true");

  fireEvent.click(getByRole("button", { name: /Likes 5/i }));
  fireEvent.click(witnessButton);

  const likedButton = await findByText("Likes 6");
  expect(likedButton.closest("button")?.getAttribute("aria-pressed")).toBe("true");
  const unwitnessedButton = await findByText("Witness 1");
  expect(unwitnessedButton.closest("button")?.getAttribute("aria-pressed")).toBe("false");
  expect(api.postLike).toHaveBeenCalledWith("https://api.example.com", "post-1", {
    clientId: "507f1f77bcf86cd799439011",
  });
  expect(api.postUnwitness).toHaveBeenCalledWith("https://api.example.com", "post-1", {
    clientId: "507f1f77bcf86cd799439011",
  });
});

test("disables feed reactions for truncated posts until the post is opened", async () => {
  api.postFeed.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      page: 1,
      hasMore: false,
      posts: [
        {
          _id: "post-long",
          name: "policy_watch",
          username: "policy.watch",
          createdAt: new Date().toISOString(),
          category: "story",
          title: "Long update",
          body: "A".repeat(180),
          likes: 5,
          dislikes: 1,
          comments: 1,
          reports: 0,
          witness: 0,
          coverImage: "",
        },
      ],
    })
  );
  api.postById.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      post: {
        _id: "post-long",
        name: "policy_watch",
        username: "policy.watch",
        createdAt: new Date().toISOString(),
        category: "story",
        title: "Long update",
        body: "B".repeat(260),
        likes: 5,
        dislikes: 1,
        comments: 1,
      },
    })
  );

  const { findByText, findByLabelText, getByRole } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  expect(await findByText("Long update")).toBeTruthy();
  expect(getByRole("button", { name: /Likes 5/i })).toBeDisabled();
  expect(getByRole("button", { name: /Dislikes 1/i })).toBeDisabled();
  const likeCallCountBeforeOpen = api.postLike.mock.calls.length;

  fireEvent.click(getByRole("button", { name: /Comments 1/i }));

  expect(await findByLabelText("Back to feed")).toBeTruthy();
  expect(api.postById).toHaveBeenCalledWith("https://api.example.com", "post-long");
  expect(api.postLike.mock.calls.length).toBe(likeCallCountBeforeOpen);
});

test("opens post details, renders body media, and lazily fetches comments", async () => {
  api.postFeed.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      page: 1,
      hasMore: false,
      posts: [
        {
          _id: "post-media",
          name: "policy_watch",
          username: "policy.watch",
          createdAt: new Date().toISOString(),
          category: "story",
          title: "Media update",
          body: "Body text [Link_cover:-https://cdn.example.com/a.png]",
          likes: 5,
          dislikes: 1,
          comments: 1,
          reports: 0,
          witness: 0,
          coverImage: "",
        },
      ],
    })
  );
  api.postComments.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      comments: [
        {
          _id: "comment-1",
          name: "Marcus Chen",
          body: "Absolutely agree. The reduction of visual noise is a game-changer for focus.",
          createdAt: new Date().toISOString(),
        },
      ],
    })
  );
  api.postById.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      post: {
        _id: "post-media",
        name: "policy_watch",
        username: "policy.watch",
        createdAt: new Date().toISOString(),
        category: "story",
        title: "Media update",
        body: "Full Body text [Link_cover:-https://cdn.example.com/a.png]",
        likes: 5,
        dislikes: 1,
        comments: 1,
      },
    })
  );

  const { container, findByText, findByLabelText, getByText } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  expect(await findByText("Media update")).toBeTruthy();
  fireEvent.click(getByText("Media update"));

  expect(await findByLabelText("Back to feed")).toBeTruthy();
  expect(api.postById).toHaveBeenCalledWith("https://api.example.com", "post-media");
  expect(container.querySelector('img[src="https://cdn.example.com/a.png"]')).toBeTruthy();
  expect(await findByText("Show comments")).toBeTruthy();

  fireEvent.click(await findByText("Show comments"));

  expect(api.postComments).toHaveBeenCalledWith("https://api.example.com", "post-media", { page: 1 });
  expect(await findByText("Marcus Chen")).toBeTruthy();
  expect(await findByText(/Absolutely agree\./i)).toBeTruthy();
});

test("sends a comment, updates local ui, and posts it to the backend", async () => {
  api.postFeed.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      page: 1,
      hasMore: false,
      posts: [
        {
          _id: "post-comment",
          name: "policy_watch",
          username: "policy.watch",
          createdAt: new Date().toISOString(),
          category: "story",
          title: "Comment update",
          body: "Body text",
          likes: 5,
          dislikes: 1,
          comments: 1,
          reports: 0,
          witness: 0,
          coverImage: "",
        },
      ],
    })
  );
  api.postComments.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      comments: [],
    })
  );
  api.createPostComment.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      comment: {
        _id: "comment-new",
        name: "Echo Tester",
        username: "echo.tester",
        userProfile: "https://cdn.example.com/echo.png",
        body: "Fresh comment",
        createdAt: new Date().toISOString(),
      },
      comments: 2,
    })
  );
  api.postById.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      post: {
        _id: "post-comment",
        name: "policy_watch",
        username: "policy.watch",
        createdAt: new Date().toISOString(),
        category: "story",
        title: "Comment update",
        body: "Body text",
        likes: 5,
        dislikes: 1,
        comments: 1,
      },
    })
  );

  const { container, findAllByText, findByText, getByText, getByPlaceholderText, getByRole } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  expect(await findByText("Comment update")).toBeTruthy();
  fireEvent.click(getByText("Comment update"));
  fireEvent.click(await findByText("Show comments"));
  await findByText("Comments");

  fireEvent.change(getByPlaceholderText("Add a comment..."), { target: { value: "Fresh comment" } });
  fireEvent.click(getByRole("button", { name: "Send" }));

  expect(api.createPostComment).toHaveBeenCalledWith("https://api.example.com", "post-comment", {
    body: "Fresh comment",
    clientId: "507f1f77bcf86cd799439011",
  });
  expect(await findByText("Fresh comment")).toBeTruthy();
  expect(await findByText("@echo.tester")).toBeTruthy();
  expect(await findByText("Comments 2")).toBeTruthy();
});

test("can reply to a comment and sends the reply target in the payload", async () => {
  api.postFeed.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      page: 1,
      hasMore: false,
      posts: [
        {
          _id: "post-reply",
          name: "policy_watch",
          username: "policy.watch",
          createdAt: new Date().toISOString(),
          category: "story",
          title: "Reply update",
          body: "Body text",
          likes: 5,
          dislikes: 1,
          comments: 1,
          reports: 0,
          witness: 0,
          coverImage: "",
        },
      ],
    })
  );
  api.postComments.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      comments: [
        {
          _id: "comment-parent",
          name: "Marcus Chen",
          username: "marcus.chen",
          userProfile: "https://cdn.example.com/marcus.png",
          body: "Parent comment",
          hasreplied: 1,
          createdAt: new Date().toISOString(),
        },
      ],
    })
  );
  api.postById.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      post: {
        _id: "post-reply",
        name: "policy_watch",
        username: "policy.watch",
        createdAt: new Date().toISOString(),
        category: "story",
        title: "Reply update",
        body: "Body text",
        likes: 5,
        dislikes: 1,
        comments: 1,
      },
    })
  );
  api.createPostComment.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      comment: {
        _id: "comment-child",
        name: "Echo Tester",
        username: "echo.tester",
        userProfile: "https://cdn.example.com/echo.png",
        body: "Nested reply",
        createdAt: new Date().toISOString(),
        isReplyTo: "comment-parent",
      },
      comments: 2,
    })
  );

  const { container, findAllByText, findByText, getByText, getByPlaceholderText, getByRole } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  expect(await findByText("Reply update")).toBeTruthy();
  fireEvent.click(getByText("Reply update"));
  fireEvent.click(await findByText("Comments 1"));
  expect(await findByText("Marcus Chen")).toBeTruthy();

  fireEvent.click(getByRole("button", { name: "Reply" }));
  expect(await findByText("Replying to Marcus Chen")).toBeTruthy();
  expect((await findAllByText("@marcus.chen")).length).toBeGreaterThan(0);
  expect(container.querySelector(".echoid-comment-card.is-reply-target")).toBeTruthy();

  fireEvent.change(getByPlaceholderText("Add a comment..."), { target: { value: "Nested reply" } });
  fireEvent.click(getByRole("button", { name: "Send" }));

  expect(api.createPostComment).toHaveBeenCalledWith("https://api.example.com", "post-reply", {
    body: "Nested reply",
    clientId: "507f1f77bcf86cd799439011",
    parentId: "comment-parent",
  });
  expect(await findByText("Nested reply")).toBeTruthy();
  expect(await findByText("@echo.tester")).toBeTruthy();
});

test("lazily fetches replies for a comment when the reply count is opened", async () => {
  api.postFeed.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      page: 1,
      hasMore: false,
      posts: [
        {
          _id: "post-thread",
          name: "policy_watch",
          username: "policy.watch",
          createdAt: new Date().toISOString(),
          category: "story",
          title: "Thread update",
          body: "Body text",
          likes: 5,
          dislikes: 1,
          comments: 3,
          reports: 0,
          witness: 0,
          coverImage: "",
        },
      ],
    })
  );
  api.postComments.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      comments: [
        {
          _id: "comment-thread-parent",
          name: "Marcus Chen",
          body: "Parent comment",
          hasreplied: 2,
          createdAt: new Date().toISOString(),
        },
      ],
    })
  );
  api.postCommentReplies.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      comments: [
        {
          _id: "comment-thread-reply",
          name: "Echo Tester",
          body: "Loaded on demand",
          parentId: "comment-thread-parent",
          createdAt: new Date().toISOString(),
        },
      ],
    })
  );
  api.postById.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      post: {
        _id: "post-thread",
        name: "policy_watch",
        username: "policy.watch",
        createdAt: new Date().toISOString(),
        category: "story",
        title: "Thread update",
        body: "Body text",
        likes: 5,
        dislikes: 1,
        comments: 3,
      },
    })
  );

  const { findByText, getByText } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  expect(await findByText("Thread update")).toBeTruthy();
  fireEvent.click(getByText("Thread update"));
  fireEvent.click(await findByText("Show comments"));
  expect(await findByText("Marcus Chen")).toBeTruthy();

  fireEvent.click(getByText("2 replies"));

  expect(api.postCommentReplies).toHaveBeenCalledWith("https://api.example.com", "comment-thread-parent");
  expect(await findByText("Loaded on demand")).toBeTruthy();
});

test("lets preview media and mark one as cover", async () => {
  global.URL.createObjectURL = vi.fn(() => "blob:echo-cover");

  const { getByText, getByLabelText, getByRole, findByText } = render(
    <MemoryRouter>
      <EchoIdPage />
    </MemoryRouter>
  );

  fireEvent.click(getByLabelText("Open menu"));
  fireEvent.click(getByText("Create Echo"));
  fireEvent.change(getByLabelText("Title"), { target: { value: "Cover test" } });
  fireEvent.change(getByLabelText("Body"), { target: { value: "This post has media." } });

  const fileInput = document.querySelector(".echoid-hidden-file-input");
  const file = new File(["hello"], "cover.png", { type: "image/png" });
  fireEvent.change(fileInput, { target: { files: [file] } });

  fireEvent.click(getByText("Preview Echo"));

  expect(await findByText("Cover media selected")).toBeTruthy();
  expect(getByRole("button", { name: "Cover media selected" })).toBeTruthy();
});

test("preview can switch between anonymous and stored profile identity", async () => {
  const { getByText, getByLabelText, findByText } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  fireEvent.click(getByLabelText("Open menu"));
  fireEvent.click(getByText("Create Echo"));
  fireEvent.change(getByLabelText("Title"), { target: { value: "Identity test" } });
  fireEvent.change(getByLabelText("Body"), { target: { value: "Testing preview identity." } });
  fireEvent.click(getByText("Preview Echo"));

  expect(getByText("@anonymous")).toBeTruthy();

  fireEvent.click(getByText("Use profile"));

  expect(getByText("Echo Tester")).toBeTruthy();
  expect(getByText("@echo.tester")).toBeTruthy();
});

test("shared post preview carousel supports swipe on compact cards", async () => {
  api.postFeed.mockResolvedValueOnce(
    jsonResponse({
      success: true,
      posts: [
        {
          _id: "swipe-post-1",
          posterId: "507f1f77bcf86cd799439099",
          name: "Kaddu Lover",
          username: "kaddu_lover",
          createdAt: new Date().toISOString(),
          category: "story",
          title: "Swipe media",
          body:
            "First [Link:-https://cdn.example.com/one.png] second [Link:-https://cdn.example.com/two.png]",
          likes: 1,
          comments: 0,
          witness: 0,
        },
      ],
    })
  );

  const { findByText, container } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  expect(await findByText("Swipe media")).toBeTruthy();

  const mediaFrame = container.querySelector(".echoid-post-media-frame");
  const activeImage = () => container.querySelector(".echoid-post-media-frame img");

  expect(mediaFrame).toBeTruthy();
  expect(activeImage()?.getAttribute("src")).toBe("https://cdn.example.com/one.png");

  fireEvent.touchStart(mediaFrame, { touches: [{ clientX: 220, clientY: 30 }] });
  fireEvent.touchEnd(mediaFrame, { changedTouches: [{ clientX: 60, clientY: 28 }] });

  expect(activeImage()?.getAttribute("src")).toBe("https://cdn.example.com/two.png");
});

test("publishes uploaded media with Link_cover for the selected cover image", async () => {
  global.URL.createObjectURL = vi.fn(() => "blob:echo-cover");
  global.XMLHttpRequest = class MockXMLHttpRequest {
    constructor() {
      this.status = 200;
      this.upload = {};
    }

    open() {}

    setRequestHeader() {}

    send(body) {
      this.upload.onprogress?.({ lengthComputable: true, loaded: body.size || 5, total: body.size || 5 });
      this.onload?.();
    }
  };

  api.postUploadInit
    .mockResolvedValueOnce(
      jsonResponse({
        success: true,
        uploadUrl: "https://upload.example.com/1",
        publicUrl: "https://cdn.example.com/1.png",
        contentType: "image/png",
      })
    )
    .mockResolvedValueOnce(
      jsonResponse({
        success: true,
        uploadUrl: "https://upload.example.com/2",
        publicUrl: "https://cdn.example.com/2.png",
        contentType: "image/png",
      })
    );
  api.createPost.mockResolvedValue(
    jsonResponse({
      success: true,
      post: {
        _id: "507f1f77bcf86cd799439011",
        title: "Cover publish",
        body: "intro [Link_cover:-https://cdn.example.com/1.png]\n[Link:-https://cdn.example.com/2.png]",
      },
    }, 201)
  );

  const { getByText, getByLabelText, findByText, getAllByText } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  fireEvent.click(getByLabelText("Open menu"));
  fireEvent.click(getByText("Create Echo"));
  fireEvent.change(getByLabelText("Title"), { target: { value: "Cover publish" } });
  fireEvent.change(getByLabelText("Body"), { target: { value: "intro" } });

  const fileInput = document.querySelector(".echoid-hidden-file-input");
  const firstFile = new File(["first"], "first.png", { type: "image/png" });
  const secondFile = new File(["second"], "second.png", { type: "image/png" });
  fireEvent.change(fileInput, { target: { files: [firstFile, secondFile] } });

  fireEvent.click(getByText("Make cover"));
  fireEvent.click(getByText("Preview Echo"));
  fireEvent.click(getByText("Publish Echo"));

  await act(async () => {
    await Promise.resolve();
  });

  expect(api.postUploadInit).toHaveBeenCalledTimes(2);
  expect(api.createPost).toHaveBeenCalledWith(
    "https://api.example.com",
    expect.objectContaining({
      title: "Cover publish",
      anonymity: true,
      body:
        "intro\n[Link:-https://cdn.example.com/1.png]\n[Link_cover:-https://cdn.example.com/2.png]",
    })
  );
  expect(api.postUploadDelete).not.toHaveBeenCalled();
});

test("cleans up uploaded media when post creation fails", async () => {
  global.URL.createObjectURL = vi.fn(() => "blob:echo-cleanup");
  global.XMLHttpRequest = class MockXMLHttpRequest {
    constructor() {
      this.status = 200;
      this.upload = {};
    }

    open() {}

    setRequestHeader() {}

    send(body) {
      this.upload.onprogress?.({ lengthComputable: true, loaded: body.size || 5, total: body.size || 5 });
      this.onload?.();
    }
  };

  api.postUploadInit.mockResolvedValue(
    jsonResponse({
      success: true,
      uploadUrl: "https://upload.example.com/cleanup",
      publicUrl: "https://cdn.example.com/cleanup.png",
      contentType: "image/png",
    })
  );
  api.createPost.mockResolvedValue(jsonResponse({ success: false, message: "create failed" }, 500));
  api.postUploadDelete.mockResolvedValue(jsonResponse({ success: true, deletedCount: 1 }));

  const { getByText, getByLabelText, findByText } = render(
    <MemoryRouter>
      <EchoIdPage host="https://api.example.com" />
    </MemoryRouter>
  );

  fireEvent.click(getByLabelText("Open menu"));
  fireEvent.click(getByText("Create Echo"));
  fireEvent.change(getByLabelText("Title"), { target: { value: "Cleanup test" } });
  fireEvent.change(getByLabelText("Body"), { target: { value: "body" } });

  const fileInput = document.querySelector(".echoid-hidden-file-input");
  const file = new File(["cleanup"], "cleanup.png", { type: "image/png" });
  fireEvent.change(fileInput, { target: { files: [file] } });

  fireEvent.click(getByText("Preview Echo"));
  fireEvent.click(getByText("Use profile"));
  fireEvent.click(getByText("Publish Echo"));

  await act(async () => {
    await Promise.resolve();
  });

  expect(api.postUploadDelete).toHaveBeenCalledWith("https://api.example.com", {
    anonymity: false,
    publicUrls: ["https://cdn.example.com/cleanup.png"],
  });
});
