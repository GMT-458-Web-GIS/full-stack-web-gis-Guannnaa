## 1. Project Overview

This project is a **Web-based Geographic Information System (WebGIS)** developed as part of the course requirements and designed as a prototype system for **Keçiören Municipality**. The primary purpose of the system is to enable faster, more efficient reporting and management of road and sidewalk damages (such as potholes, cracks, and surface deformations) within the district.

Through this system, citizens can directly report infrastructure problems by marking their exact locations on an interactive map. Municipal workers can update repair statuses, while managers can assign available teams to reported incidents. This workflow helps the municipality receive damage notifications more quickly, prioritize maintenance tasks, and coordinate repair teams effectively.

In addition to its practical motivation, the project demonstrates core WebGIS concepts including spatial data handling, role-based authorization, RESTful API development, spatial indexing, and performance analysis. The application was intentionally developed without external map servers or third-party APIs to highlight full control over spatial data and system performance.



---


## 2. System Architecture

The system follows a **client–server architecture**:

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Node.js (Express.js)
* **Database:** PostgreSQL with PostGIS extension
* **API Documentation:** Swagger (OpenAPI)

All components run locally and communicate through RESTful HTTP requests.

---

## 3. User Roles and Authorization

The system supports role-based access control with three user types:
<img width="1839" height="965" alt="image" src="https://github.com/user-attachments/assets/0f639016-5952-4892-b9cc-df614ef49d00" />

* **User:** Can create spatial incident reports and view reports.
* <img width="1839" height="962" alt="image" src="https://github.com/user-attachments/assets/2c93cdf1-e0bb-4241-bcf8-acf4c9bd6ca4" />

* **Worker:** Can update the status of assigned reports.
* <img width="1833" height="961" alt="image" src="https://github.com/user-attachments/assets/b5493591-388d-4cd5-8a7c-360ba7c52893" />

* **Manager:** Can assign teams to reports, manage teams, and delete reports.
* <img width="1838" height="958" alt="image" src="https://github.com/user-attachments/assets/bc343443-26c3-449b-8161-cf16471fe4c0" />


Authentication is handled using **JWT (JSON Web Tokens)**, ensuring secure access to protected endpoints.

---

## 4. Database Design

The spatial database is implemented using **PostgreSQL + PostGIS**.

### Tables:

* **users:** Stores user credentials and roles
* **reports:** Stores spatial incident reports (POINT geometry)
* **teams:** Stores team information and availability status

Spatial data is stored using EPSG:4326 coordinate reference system.

---

## 5. CRUD Operations

The application fully supports CRUD operations:

* **Create:** Users can create new spatial reports
* **Read:** All users can retrieve reports
* **Update:** Managers assign teams, workers update report status
* **Delete:** Managers can delete reports

All CRUD operations are implemented via RESTful API endpoints.

---

## 6. REST API Development

A RESTful API was developed to manage both spatial and non-spatial data.

### Main Endpoints:

* `POST /register` – User registration
* `POST /login` – User authentication
* `GET /reports` – Retrieve spatial reports
* `POST /reports` – Create a spatial report
* `PUT /reports/{id}/assign` – Assign team (Manager)
* `PUT /reports/{id}/status` – Update status (Worker)
* `DELETE /reports/{id}` – Delete report (Manager)
* `GET /teams` – Retrieve teams (Manager)

---

## 7. API Documentation (Swagger)

The API is documented using **Swagger UI**, which provides an interactive interface for testing and exploring the endpoints.

Swagger documentation clearly shows request/response structures, authentication requirements, and role-based access restrictions.

Swagger UI is available at:

```
http://localhost:3000/api-docs
```
<img width="1852" height="922" alt="image" src="https://github.com/user-attachments/assets/e0ed14c9-eea6-42c9-9d55-9cbc85b03e51" />

---

## 8. Spatial Data Usage

Spatial data is handled using **PostGIS geometry types**. Incident locations are stored as POINT geometries.

Spatial queries include:

* Distance-based filtering using `ST_DWithin`
* Bounding box filtering

---

## 9. Spatial Index Experiment

A **GiST spatial index** was created on the geometry column of the `reports` table.

### Query Without Index:

* Sequential Scan
* Higher execution time
<img width="1907" height="1022" alt="Ekran görüntüsü 2026-01-14 174300" src="https://github.com/user-attachments/assets/d5e3c83c-3038-4436-b005-7c868983b397" />

### Query With Index:

* Bitmap Index Scan
* Significantly reduced execution time

The experiment demonstrates the performance improvement achieved by spatial indexing.
<img width="1915" height="1020" alt="Ekran görüntüsü 2026-01-14 174332" src="https://github.com/user-attachments/assets/c61d83e0-78a0-4306-9d36-4003116f0ab5" />

---

## 10. Performance Testing

Performance testing was conducted using **Artillery**.

Load tests simulated multiple concurrent users accessing the API endpoints. Metrics such as response time, request rate, and error rates were analyzed.

The results confirm that the system can handle concurrent requests efficiently under load.
<img width="946" height="763" alt="Ekran görüntüsü 2026-01-14 182430" src="https://github.com/user-attachments/assets/fcfd4304-7d92-4d7a-bfd4-b22d98f954cc" />

---

## 11. Testing Tools

* **Postman:** Manual API testing
* **Swagger UI:** Interactive API testing and documentation
* **Artillery:** Load and performance testing

---

## 12. Installation and Execution

### Requirements:

* Node.js
* PostgreSQL
* PostGIS

### Steps:

```bash
npm install
node server.js
```

---

## 13. Conclusion

This project successfully demonstrates the development of a WebGIS application with spatial data management, role-based authorization, RESTful API design, spatial indexing, and performance testing. The system meets all mandatory and selected optional requirements defined in the course guidelines.

---

## 14. Author

**Engin Gökhan Sefer**
