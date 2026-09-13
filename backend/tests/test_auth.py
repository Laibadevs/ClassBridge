def test_signup_teacher_success(client):
    res = client.post(
        "/api/auth/signup",
        json={"full_name": "Ms. Sarah", "email": "sarah@example.com", "password": "password123", "role": "teacher"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["role"] == "teacher"
    assert body["email"] == "sarah@example.com"
    assert "password" not in body
    assert "password_hash" not in body
    # signup also logs the user in
    assert "cb_session" in res.cookies


def test_signup_parent_success(client):
    res = client.post(
        "/api/auth/signup",
        json={"full_name": "Ali's Parent", "email": "parent@example.com", "password": "password123", "role": "parent"},
    )
    assert res.status_code == 201
    assert res.json()["role"] == "parent"


def test_signup_duplicate_email(client):
    payload = {"full_name": "A", "email": "dup@example.com", "password": "password123", "role": "teacher"}
    assert client.post("/api/auth/signup", json=payload).status_code == 201
    res = client.post("/api/auth/signup", json=payload)
    assert res.status_code == 409
    assert "already registered" in res.json()["detail"]


def test_signup_invalid_email(client):
    res = client.post(
        "/api/auth/signup",
        json={"full_name": "A", "email": "not-an-email", "password": "password123", "role": "teacher"},
    )
    assert res.status_code == 422


def test_signup_invalid_role(client):
    res = client.post(
        "/api/auth/signup",
        json={"full_name": "A", "email": "a@example.com", "password": "password123", "role": "admin"},
    )
    assert res.status_code == 422


def test_signup_weak_password(client):
    res = client.post(
        "/api/auth/signup",
        json={"full_name": "A", "email": "weak@example.com", "password": "123", "role": "teacher"},
    )
    assert res.status_code == 422


def test_login_success_teacher(client):
    client.post(
        "/api/auth/signup",
        json={"full_name": "T", "email": "t@example.com", "password": "password123", "role": "teacher"},
    )
    res = client.post("/api/auth/login", json={"email": "t@example.com", "password": "password123", "role": "teacher"})
    assert res.status_code == 200
    assert res.json()["role"] == "teacher"


def test_login_success_parent(client):
    client.post(
        "/api/auth/signup",
        json={"full_name": "P", "email": "p@example.com", "password": "password123", "role": "parent"},
    )
    res = client.post("/api/auth/login", json={"email": "p@example.com", "password": "password123", "role": "parent"})
    assert res.status_code == 200
    assert res.json()["role"] == "parent"


def test_login_wrong_password(client):
    client.post(
        "/api/auth/signup",
        json={"full_name": "T", "email": "t2@example.com", "password": "password123", "role": "teacher"},
    )
    res = client.post("/api/auth/login", json={"email": "t2@example.com", "password": "wrongpass", "role": "teacher"})
    assert res.status_code == 401


def test_login_nonexistent_user(client):
    res = client.post("/api/auth/login", json={"email": "ghost@example.com", "password": "password123", "role": "teacher"})
    assert res.status_code == 401


def test_login_role_mismatch(client):
    client.post(
        "/api/auth/signup",
        json={"full_name": "T", "email": "mismatch@example.com", "password": "password123", "role": "teacher"},
    )
    res = client.post(
        "/api/auth/login", json={"email": "mismatch@example.com", "password": "password123", "role": "parent"}
    )
    assert res.status_code == 403
    assert "registered as a Teacher" in res.json()["detail"]


def test_me_authenticated(client):
    client.post(
        "/api/auth/signup",
        json={"full_name": "Me", "email": "me@example.com", "password": "password123", "role": "teacher"},
    )
    res = client.get("/api/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] == "me@example.com"


def test_me_unauthenticated(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_logout_clears_session(client):
    client.post(
        "/api/auth/signup",
        json={"full_name": "Out", "email": "out@example.com", "password": "password123", "role": "teacher"},
    )
    csrf = client.cookies.get("cb_csrf")
    res = client.post("/api/auth/logout", headers={"x-csrf-token": csrf})
    assert res.status_code == 200

    # The session must actually be dead server-side, not just have a cleared cookie.
    res_me = client.get("/api/auth/me")
    assert res_me.status_code == 401


def test_logout_requires_csrf_token(client):
    client.post(
        "/api/auth/signup",
        json={"full_name": "Csrf", "email": "csrf@example.com", "password": "password123", "role": "teacher"},
    )
    res = client.post("/api/auth/logout")
    assert res.status_code == 403


def test_forgot_password_neutral_message_for_unknown_email(client):
    res = client.post("/api/auth/forgot-password", json={"email": "unknown@example.com"})
    assert res.status_code == 200
    assert "If an account exists" in res.json()["message"]
