from fastapi.testclient import TestClient

from src.app import app

client = TestClient(app)


def test_public_activity_view_is_available_without_login():
    response = client.get("/activities")

    assert response.status_code == 200
    assert "Chess Club" in response.json()


def test_student_signup_requires_teacher_login():
    response = client.post(
        "/activities/Chess Club/signup",
        params={"email": "student@example.com"},
    )

    assert response.status_code == 401
    assert "Teacher login required" in response.json()["detail"]


def test_teacher_login_allows_signup_and_logout():
    login_response = client.post(
        "/login",
        data={"username": "teacher", "password": "school123"},
    )

    assert login_response.status_code == 200
    assert login_response.json()["message"] == "Logged in as teacher"

    signup_response = client.post(
        "/activities/Chess Club/signup",
        params={"email": "newstudent@example.com"},
    )

    assert signup_response.status_code == 200
    assert "newstudent@example.com" in client.get("/activities").json()["Chess Club"]["participants"]

    logout_response = client.post("/logout")
    assert logout_response.status_code == 200
    assert logout_response.json()["message"] == "Logged out"
