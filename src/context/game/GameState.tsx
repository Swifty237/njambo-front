import React, { useContext, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  CALL,
  CHECK,
  FOLD,
  JOIN_TABLE,
  LEAVE_TABLE,
  RAISE,
  REBUY,
  SIT_DOWN,
  STAND_UP,
  TABLE_JOINED,
  TABLE_LEFT,
  TABLE_UPDATED,
  PLAY_ONE_CARD,
  PLAYED_CARD,
  SHOW_DOWN,
} from '../../pokergame/actions';
import authContext from '../auth/authContext';
import socketContext from '../websocket/socketContext';
import GameContext, { TatamiProps } from './gameContext';
import { Table, TableUpdatedPayload, TableEventPayload, CardProps } from '../../types/SeatTypesProps';

interface GameStateProps {
  children: React.ReactNode
}

const GameState = ({ children }: GameStateProps) => {
  const history = useHistory();
  const { socket } = useContext(socketContext);
  const { loadUser } = useContext(authContext);

  const [messages, setMessages] = useState<string[]>([]);
  const [currentTable, setCurrentTable] = useState<Table | null>(null);
  const [currentTables, setCurrentTables] = useState<{ [key: string]: Table } | null>(null);
  const [isPlayerSeated, setIsPlayerSeated] = useState(false);
  const [seatId, setSeatId] = useState<string | null>(null);
  const [elevatedCard, setElevatedCard] = useState<string | null>(null);
  const currentTableRef = React.useRef(currentTable);
  const currentTablesRef = React.useRef(currentTables);

  useEffect(() => {
    currentTableRef.current = currentTable;
    currentTablesRef.current = currentTables;

    // eslint-disable-next-line
  }, [currentTable]);

  useEffect(() => {
    if (socket) {
      window.addEventListener('unload', leaveTable);
      window.addEventListener('close', leaveTable);

      socket.on(TABLE_UPDATED, ({ table, message }: TableUpdatedPayload) => {
        setCurrentTable(table);
        message && addMessage(message);
      });

      socket.on(TABLE_JOINED, ({ tables, tableId }: TableEventPayload) => {
        setCurrentTables(tables);
        setCurrentTable(tables[tableId]);
      });

      socket.on(TABLE_LEFT, ({ tables }: TableEventPayload) => {
        setCurrentTable(null);
        loadUser(localStorage.token);
        setMessages([]);
      });

      socket.on(PLAYED_CARD, ({ tables, tableId }: TableEventPayload) => {
        setCurrentTables(tables);
        setCurrentTable(tables[tableId]);
      });

      socket.on(SHOW_DOWN, ({ tables, tableId }: TableEventPayload) => {
        setCurrentTables(tables);
        setCurrentTable(tables[tableId]);
      });
    }
    return () => leaveTable();
    // eslint-disable-next-line
  }, [socket]);


  // Fonction de test
  const injectDebugHand = (seatNumber: string) => {
    setCurrentTable((prevTable) => {
      if (!prevTable) return null;

      // Copie profonde pour éviter mutation
      const updatedSeats = {
        ...prevTable.seats,
        [seatNumber]: {
          ...prevTable.seats[seatNumber],
          hand: [
            { suit: 'h', rank: '8' },
            { suit: 's', rank: '10' },
            { suit: 'c', rank: '10' },
            { suit: 'd', rank: '5' },
            { suit: 's', rank: '3' },
          ],
          playedHand: [
            { suit: 'h', rank: '8' },
            { suit: 's', rank: '10' },
            { suit: 'c', rank: '10' },
            { suit: 'd', rank: '5' },
            { suit: 's', rank: '3' },
          ],
        },
      };

      const updatedTable: Table = {
        ...prevTable,
        seats: updatedSeats,
      };

      return updatedTable;
    });
  };

  // Fonction pour abaisser toutes les cartes
  // const clearAllElevatedCards = () => {
  //   setElevatedCards([]);
  // };

  const getHandsPosition = (seatId: string) => {
    switch (seatId) {
      case "1":
        return {
          bottom: "-5vh",
          left: "2vw"
        };
      case "2":
        return {
          left: "2vw"
        };
      case "3":
        return {
          display: "flex",
          flexDirection: "column-reverse",
          top: "-5vh",
          right: "2vw"
        };
      case "4":
        return {
          display: "flex",
          flexDirection: "column-reverse",
          right: "2vw"
        };
      default:
        return {

        };
    }
  }




  const joinTable = (tatamiData: TatamiProps) => {
    socket.emit(JOIN_TABLE, tatamiData);
  };

  const leaveTable = () => {
    isPlayerSeated && standUp();
    currentTableRef &&
      currentTableRef.current &&
      currentTableRef.current.id &&
      socket.emit(LEAVE_TABLE, currentTableRef.current.id);
    history.push('/');
  };

  const sitDown = (tableId: string, seatId: string, amount: number) => {
    socket.emit(SIT_DOWN, { tableId, seatId, amount });
    setIsPlayerSeated(true);
    setSeatId(seatId);
  };

  // Fonction pour jouer une carte (double clic) - modifiée
  const playOneCard = (card: CardProps, seatNumber: string) => {

    if (currentTable) {
      const currentSeat = currentTable.seats[seatNumber];

      if (currentSeat && currentSeat.hand) {

        // Trouver la carte dans la main
        const cardIndex = currentSeat.hand.findIndex((handCard) => handCard.suit === card.suit && handCard.rank === card.rank);

        if (cardIndex === -1) {
          console.warn('Carte non trouvée dans la main du joueur');
          return;
        }

        // Envoyer la carte au serveur via socket
        if (socket && currentTable) {
          socket.emit(PLAY_ONE_CARD, {
            tableId: currentTable.id,
            seatId: seatNumber,
            playedCard: card,
          });
        }
      }
    }

    // Retirer la carte jouée des cartes élevées
    const cardKey = `${seatNumber}-${card.suit}-${card.rank}`;
    if (elevatedCard === cardKey) {
      setElevatedCard(null);
    }
  };

  const showDown = () => {
    if (currentTableRef && currentTableRef.current && seatId) {
      socket.emit(SHOW_DOWN, {
        tableId: currentTableRef.current.id,
        seatId: seatId
      });
    }
  }

  const rebuy = (tableId: string, seatId: string, amount: number) => {
    socket.emit(REBUY, { tableId, seatId, amount });
  };

  const standUp = () => {
    currentTableRef &&
      currentTableRef.current &&
      socket.emit(STAND_UP, currentTableRef.current.id);
    setIsPlayerSeated(false);
    setSeatId(null);
  };

  const addMessage = (message: string) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const fold = () => {
    currentTableRef &&
      currentTableRef.current &&
      socket.emit(FOLD, currentTableRef.current.id);
  };

  const check = () => {
    currentTableRef &&
      currentTableRef.current &&
      socket.emit(CHECK, currentTableRef.current.id);
  };

  const call = () => {
    currentTableRef &&
      currentTableRef.current &&
      socket.emit(CALL, currentTableRef.current.id);
  };

  const raise = (amount: number) => {
    currentTableRef &&
      currentTableRef.current &&
      socket.emit(RAISE, { tableId: currentTableRef.current.id, amount });
  };

  return (
    <GameContext.Provider
      value={{
        messages,
        currentTable,
        isPlayerSeated,
        seatId,
        elevatedCard,
        joinTable,
        leaveTable,
        sitDown,
        standUp,
        addMessage,
        fold,
        check,
        call,
        raise,
        rebuy,
        injectDebugHand,
        getHandsPosition,
        playOneCard,
        setElevatedCard,
        showDown
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export default GameState;
