import Vue from 'vue';
import Vuex from 'vuex';
import gql from 'graphql-tag';
import config from '../../../../config';

import graphqlClient from '../utils/graphql.utils';

const renderClient = graphqlClient(`${config.http}${config.host}:3002/graphql`, `${config.ws}${config.host}:3002/subscriptions`);
const userClient = graphqlClient(`${config.http}${config.host}:3001/graphql`, `${config.ws}${config.host}:3001/subscriptions`);

const GRID_SUBSCRIPTION = gql`
  subscription update {
    renderUpdate {
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

export default new Vuex.Store({
  state: {
    grid: {},
    userId: '',
    musicOn: false,
  },
  getters: {
    grid: (state) => state.grid,
    userId: (state) => state.userId,
    musicOn: (state) => state.musicOn,
  },
  mutations: {
    setGrid(state, grid) {
      state.grid = grid;
    },
    setUserId(state, id) {
      Vue.set(state, 'userId', id);
    },
    setMusic(state, bool) {
      Vue.set(state, 'musicOn', bool);
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
        await renderClient.subscribe({
          query: GRID_SUBSCRIPTION,
        }).subscribe({
          next({ data }) {
            commit('setGrid', data.renderUpdate);
          },
          error(err) { console.error('err', err); },
        });
      } catch (e) {
        console.error(e);
      }
    },
    async changeDirection({ getters }, direction) {
      try {
        await userClient.mutate({
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

        const result = await userClient.mutate({
          mutation: CREATE_USER_MUTATION,
          variables: {
            title,
            color,
            sprite,
            position: { x: 50, y: 50 },
          },
        });

        commit('setUserId', result.data.createUser.id);

        userSub = await userClient.subscribe({
          query: USER_LOST_SUBSCRIPTION,
          variables: {
            userId: result.data.createUser.id,
          },
        }).subscribe({
          next() {
            console.log('dead');
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
  },
  modules: {
  },
});
