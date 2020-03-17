import gql from 'graphql-tag';

const GRID_SUBSCRIPTION = gql`
  subscription update {
    renderUpdates {
      cellSize
      cols {
        rows {
          nodes {
            id
            type
            title
            position { x, y }
            radius
            sprite
            color
          }
        }
      }
      playerNodes {
        id
        title
        position { x, y }
        radius
        gridIndices { x, y }
      }
    }
  }
`;

const LEADER_BOARD_SUBSCRIPTION = gql`
  subscription updateBoad {
    leaderBoardUpdates {
      entries {
        title
        points
        sprite
        color
      }
    }
  }
`;

const USER_LOST_SUBSCRIPTION = gql`
  subscription lost($userId: ID!) {
    userLost(userId: $userId) {
      id
    }
  }
`;

const DIRECTION_MUTATION = gql`
  mutation direction($userId: ID!, $direction: Direction!) {
    changeDirection(userId: $userId, newDirection: $direction) {
      id
    }
  }
`;

const CREATE_USER_MUTATION = gql`
  mutation create($title: String!, $color: String, $sprite: String, $position: PositionInput!) {
    createUser(data: { title:$title, color:$color, sprite:$sprite, position:$position }) {
      id
    }
  }
`;

module.exports = {
  GRID_SUBSCRIPTION,
  LEADER_BOARD_SUBSCRIPTION,
  USER_LOST_SUBSCRIPTION,
  CREATE_USER_MUTATION,
  DIRECTION_MUTATION,
};
