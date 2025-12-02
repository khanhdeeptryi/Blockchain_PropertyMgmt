import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { createBlockiesAvatar } from "../utils/blockies";

export default function NavBar({ account, networkOk, onConnect }) {
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    if (account) {
      const avatarUrl = createBlockiesAvatar(account);
      setAvatar(avatarUrl);
    } else {
      setAvatar(null);
    }
  }, [account]);

  return (
    <header className="navbar">
      <div className="brand">
        <span className="brand-icon">🔐</span>
        <span className="brand-text">TokProp</span>
      </div>

      <nav className="nav-links">
        <NavLink to="/" end className={({isActive}) => isActive ? 'active' : ''}>
          Dashboard
        </NavLink>
        <NavLink to="/token" className={({isActive}) => isActive ? 'active' : ''}>
          Token MDT
        </NavLink>
        <NavLink to="/nft" className={({isActive}) => isActive ? 'active' : ''}>
          NFT Tài sản
        </NavLink>
        <NavLink to="/assets" className={({isActive}) => isActive ? 'active' : ''}>
          Quản lý Tài sản
        </NavLink>
      </nav>

      <div className="nav-center">
        <div className={`network-status ${networkOk ? 'connected' : 'warning'}`}>
          <span className="network-icon">{networkOk ? '✓' : '⚠'}</span>
          <span className="network-name">{networkOk ? 'Sepolia' : 'Wrong Network'}</span>
        </div>
      </div>

      <div className="nav-actions">
        <button onClick={onConnect} className="connect-button">
          {account ? (
            <>
              {avatar && <img src={avatar} alt="avatar" className="wallet-avatar" />}
              <span>{account.slice(0, 6)}...{account.slice(-4)}</span>
            </>
          ) : (
            'Kết nối MetaMask'
          )}
        </button>
      </div>
    </header>
  );
}
