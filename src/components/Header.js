import React, { useContext } from "react";
import { FaHome, FaCommentDots, FaDatabase } from "react-icons/fa";
import { BiLineChart } from "react-icons/bi";
import { Navbar, Nav, Container } from "react-bootstrap";
import StoreContext from "../store/store-context";

const Header = (_) => {
  const storeCtx = useContext(StoreContext);
  return (
    <Navbar bg="teal" variant="dark" expand="lg">
      <Navbar.Brand href="/">
        <img
          src="img/TideBit_White_hk.png"
          className="d-inline-block align-top"
          alt="TideBit"
          width="125px"
        />
      </Navbar.Brand>
      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        <Nav.Link href="/markets/btchkd">Trading</Nav.Link>
        <Nav.Link href="https://tidebit.zendesk.com/hc/zh-tw/articles/360003146914-%E5%A4%A7%E9%A1%8D%E4%BA%A4%E6%98%93Block-Trade-OTC-%E5%B0%88%E5%B1%AC-Whatsapp-852-62871829">
          Block Trade
        </Nav.Link>
        <Nav.Link href="/digital_staking/plans">Digital Staking</Nav.Link>
        <Nav.Link href="/referral">Refer Now</Nav.Link>
        {!storeCtx.isLogin && (
          <React.Fragment>
            <Nav.Link href="/signin">Login</Nav.Link>
            <Nav.Link href="/signup">Register</Nav.Link>
          </React.Fragment>
        )}
        {storeCtx.isLogin && (
          <React.Fragment>
            <Nav.Link href="/referral">Accounts</Nav.Link>
            <Nav.Link href="/signin">Logout</Nav.Link>
          </React.Fragment>
        )}
      </Navbar.Collapse>
      {false && (
        <Container>
          <Nav className="justify-content-end flex-grow-1 pe-3">
            <Nav.Link href="/">
              <Container>
                <FaHome />
                <p>Home</p>
              </Container>
            </Nav.Link>
            <Nav.Link href="/markets/btchkd">
              <Container>
                <BiLineChart />
                <p>Trading</p>
              </Container>
            </Nav.Link>
            <Nav.Link href="https://tidebit.zendesk.com/hc/zh-tw/articles/360003146914-%E5%A4%A7%E9%A1%8D%E4%BA%A4%E6%98%93Block-Trade-OTC-%E5%B0%88%E5%B1%AC-Whatsapp-852-62871829">
              <FaCommentDots />
              <p>Block Trade</p>
            </Nav.Link>
            <Nav.Link href="/digital_staking/plans">
              <Container>
                <FaDatabase />
                <p>Block Trade</p>
              </Container>
            </Nav.Link>
            <Nav.Link href="/markets/btchkd">
              <Container>
                <FaCommentDots />
                <p>Block Trade</p>
              </Container>
            </Nav.Link>
            <Nav.Link href="/markets/btchkd">
              <Container>
                <FaCommentDots />
                <p>Block Trade</p>
              </Container>
            </Nav.Link>
            <Nav.Link href="/markets/btchkd">
              <Container>
                <FaCommentDots />
                <p>Block Trade</p>
              </Container>
            </Nav.Link>
            <Nav.Link href="/markets/btchkd">
              <Container>
                <FaCommentDots />
                <p>Block Trade</p>
              </Container>
            </Nav.Link>
            <Nav.Link href="/markets/btchkd">
              <Container>
                <FaCommentDots />
                <p>Block Trade</p>
              </Container>
            </Nav.Link>
          </Nav>
        </Container>
      )}
    </Navbar>
  );
};

export default Header;
