import React, { useState } from "react";
import AdminHeader from "../components/AdminHeader";

import Manager from "./manager";
const Admin = () => {
  const [activePage, setActivePage] = useState("manager");
  const onSelected = (page) => {
    setActivePage(page);
  };
  return (
    <div className="admin">
      <AdminHeader activePage={activePage} onSelected={onSelected} />
      {activePage === "manager" && <Manager />}
    </div>
  );
};

export default Admin;
