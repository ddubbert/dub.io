import Vue from 'vue';
import Vuex from 'vuex';
import gql from 'graphql-tag';
import config from '../../../../config';

import graphqlClient from '../utils/graphql.utils';

const client = graphqlClient(`${config.http}${config.host}:3000/graphql`, `${config.ws}${config.host}:3000/subscriptions`);

const GRID_SUBSCRIPTION = gql`
  subscription update {
    renderUpdates {
      cellSize
      cols {
        rows {
          nodes {
            id
            type
            createdAt
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
        type
        createdAt
        title
        position { x, y }
        radius
        sprite
        color
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
      type
      createdAt
      title
      position { x, y }
      radius
      sprite
      color
    }
  }
`;

const DIRECTION_MUTATION = gql`
  mutation direction($userId: ID!, $direction: Direction!) {
    changeDirection(userId: $userId, newDirection: $direction) {
      id
      type
      title
      position { x, y }
      radius
      sprite
      color
      createdAt
    }
  }
`;

const CREATE_USER_MUTATION = gql`
  mutation create($title: String!, $color: String, $sprite: String, $position: PositionInput!) {
    createUser(data: { title:$title, color:$color, sprite:$sprite, position:$position }) {
      id
      type
      title
      position { x, y }
      radius
      sprite
      color
      createdAt
    }
  }
`;

Vue.use(Vuex);

let userSub = null;
let count = 0;
let startTime = null;

export default new Vuex.Store({
  state: {
    grid: {},
    leaderBoard: [],
    userId: '',
    musicOn: false,
    userStartPosition: { x: 50, y: 50 },
  },
  getters: {
    grid: (state) => state.grid,
    leaderBoard: (state) => state.leaderBoard,
    userId: (state) => state.userId,
    musicOn: (state) => state.musicOn,
    userStartPosition: (state) => state.userStartPosition,
  },
  mutations: {
    setGrid(state, grid) {
      state.grid = grid;
    },
    setLeaderBoard(state, leaderBoard) {
      state.leaderBoard = leaderBoard;
    },
    setUserId(state, id) {
      Vue.set(state, 'userId', id);
    },
    setMusic(state, bool) {
      Vue.set(state, 'musicOn', bool);
    },
    setUserStartPosition(state, position) {
      state.userStartPosition.x = position.x;
      state.userStartPosition.y = position.y;
    },
    unsubUser(state) {
      if (state.userId) {
        if (userSub) {
          userSub.unsubscribe();
          userSub = null;
        }

        Vue.set(state, 'userId', '');
      }
    },
  },
  actions: {
    async subscribe({ commit }) {
      try {
        await client.subscribe({
          query: GRID_SUBSCRIPTION,
        }).subscribe({
          next({ data }) {
            count += 1;
            commit('setGrid', data.renderUpdates);
          },
          error(err) { console.error('err', err); },
        });

        await client.subscribe({
          query: LEADER_BOARD_SUBSCRIPTION,
        }).subscribe({
          next({ data }) {
            commit('setLeaderBoard', data.leaderBoardUpdates.entries);
          },
          error(err) { console.error('err', err); },
        });
      } catch (e) {
        console.error(e);
      }
    },
    async changeDirection({ getters }, direction) {
      try {
        await client.mutate({
          mutation: DIRECTION_MUTATION,
          variables: { userId: getters.userId, direction },
        });
      } catch (e) {
        console.error(e);
      }
    },
    async createUser({ commit, state }, { title, sprite, color }) {
      try {
        if (state.userId) commit('unsubUser');

        const result = await client.mutate({
          mutation: CREATE_USER_MUTATION,
          variables: {
            title,
            color,
            sprite,
            position: state.userStartPosition,
          },
        });

        if (startTime) {
          const diff = new Date().getTime() - startTime;
          const seconds = diff / 1000;
          console.log(count / seconds);
        }
        startTime = new Date().getTime();
        count = 0;

        commit('setUserId', result.data.createUser.id);

        userSub = await client.subscribe({
          query: USER_LOST_SUBSCRIPTION,
          variables: {
            userId: result.data.createUser.id,
          },
        }).subscribe({
          next() {
            commit('unsubUser');
          },
          error(err) { console.error('err', err); },
        });
      } catch (e) {
        console.error(e);
      }
    },
    switchMusic({ commit }, bool) {
      commit('setMusic', bool);
    },
    newUserStartPosition({ commit }, position) {
      commit('setUserStartPosition', position);
    },
  },
  modules: {
  },
});
