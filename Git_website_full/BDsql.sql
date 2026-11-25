CREATE TABLE users(
    "id" int PRIMARY KEY,
    "lastname" varchar(255),
    "firstname" varchar(255),
    "email" varchar(255),
    "phone" varchar(255),
    "picture" varchar(255)
);
CREATE TABLE skills(
    "id" int PRIMARY KEY,
    "user_id" int,
    "name" varchar(255),
    "level" varchar(255),
    FOREIGN KEY ("user_id") REFERENCES users("id")
);
CREATE TABLE experience(
    "id" int PRIMARY KEY,
    "user_id" int,
    "name" varchar(255),
    "description" varchar(255),
    "startdate" date,
    "enddate" date,
    FOREIGN KEY ("user_id") REFERENCES users("id")
);
CREATE TABLE education(
    "id" int PRIMARY KEY,
    "user_id" int,
    "name" varchar(255),
    "description" varchar(255),
    "startdate" date,
    "enddate" date,
    FOREIGN KEY ("user_id") REFERENCES users("id")
);