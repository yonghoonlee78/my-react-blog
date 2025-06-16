import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchBar = () => {
  const [input, setInput] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    const q = input.trim();

    
    if (q.startsWith('0x')) {
      navigate(`/explorer/tx/${q}`);        
    } else {
      navigate(`/explorer/block/${q}`);     
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Enter Block Number or Tx Hash"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ width: '60%' }}
      />
      <button onClick={handleSearch}>Search</button>
    </div>
  );
};

export default SearchBar;
