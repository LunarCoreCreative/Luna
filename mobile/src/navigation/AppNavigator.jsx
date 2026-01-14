/**
 * App Navigator
 * =============
 * Configuração de navegação principal do app usando Bottom Tabs Navigator
 * Tab bar é ocultada na tela de Chat
 */

import React from 'react';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Função de interpolação suave para transições
const smoothTransition = ({ current, next, layouts }) => {
  return {
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        },
      ],
      opacity: current.progress.interpolate({
        inputRange: [0, 0.3, 0.5, 1],
        outputRange: [0, 0.5, 0.8, 1],
      }),
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
      }),
    },
  };
};

// Stack Navigator para telas dentro da tab Home
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.bg.primary },
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 200,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 150,
            },
          },
        },
        cardStyleInterpolator: smoothTransition,
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

// Stack Navigator para telas dentro da tab Chats
function ChatsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.bg.primary },
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 200,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 150,
            },
          },
        },
        cardStyleInterpolator: smoothTransition,
      }}
    >
      <Stack.Screen name="ChatsMain" component={ChatsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.accent.primary,
          background: colors.bg.primary,
          card: colors.bg.primary,
          text: colors.text.primary,
          border: colors.border,
          notification: colors.accent.primary,
        },
      }}
    >
      <Tab.Navigator
        screenOptions={({ route }) => {
          // Obtém o nome da rota focada dentro do stack
          const routeName = getFocusedRouteNameFromRoute(route) ?? route.name;
          const isChatScreen = routeName === 'Chat';
          
          return {
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.bg.secondary,
              borderTopColor: colors.border,
              borderTopWidth: 1,
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
              display: isChatScreen ? 'none' : 'flex', // Oculta quando está na tela Chat
            },
            tabBarActiveTintColor: colors.accent.primary,
            tabBarInactiveTintColor: colors.text.muted,
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
          };
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeStack}
          options={{
            tabBarLabel: 'Início',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Chats" 
          component={ChatsStack}
          options={{
            tabBarLabel: 'Chats',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
