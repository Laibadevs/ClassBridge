def _signup(client, role: str, email: str):
    return client.post(
        "/api/auth/signup",
        json={"full_name": "User", "email": email, "password": "password123", "role": role},
    )


def test_teacher_can_access_teacher_route(client):
    _signup(client, "teacher", "teacher1@example.com")
    res = client.get("/api/teacher/ping")
    assert res.status_code == 200
    assert res.json()["role"] == "teacher"


def test_parent_cannot_access_teacher_route(client):
    _signup(client, "parent", "parent1@example.com")
    res = client.get("/api/teacher/ping")
    assert res.status_code == 403


def test_parent_can_access_parent_route(client):
    _signup(client, "parent", "parent2@example.com")
    res = client.get("/api/parent/ping")
    assert res.status_code == 200
    assert res.json()["role"] == "parent"


def test_teacher_cannot_access_parent_route(client):
    _signup(client, "teacher", "teacher2@example.com")
    res = client.get("/api/parent/ping")
    assert res.status_code == 403


def test_unauthenticated_cannot_access_either_route(client):
    assert client.get("/api/teacher/ping").status_code == 401
    assert client.get("/api/parent/ping").status_code == 401
