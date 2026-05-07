import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  Award,
  Target,
  BookOpen,
  Calendar,
  Info,
  Gift,
  Star
} from 'lucide-react';

export function Credits() {
  const { user, transactions } = useApp();

  // Early return if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-20 lg:pt-24 flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your credits.</p>
      </div>
    );
  }

  // Calculate monthly statistics
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.timestamp);
    return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
  });

  const monthlyEarned = monthlyTransactions
    .filter(t => t.type === 'earned')
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlySpent = monthlyTransactions
    .filter(t => t.type === 'spent')
    .reduce((sum, t) => sum + t.amount, 0);

  // Credit level system
  const creditLevels = [
    { name: 'Bronze', min: 0, max: 50, color: 'text-orange-600', bgColor: 'bg-orange-100', darkBgColor: 'dark:bg-orange-900/20' },
    { name: 'Silver', min: 51, max: 100, color: 'text-gray-600', bgColor: 'bg-gray-100', darkBgColor: 'dark:bg-gray-800/20' },
    { name: 'Gold', min: 101, max: 200, color: 'text-yellow-600', bgColor: 'bg-yellow-100', darkBgColor: 'dark:bg-yellow-900/20' },
    { name: 'Platinum', min: 201, max: 500, color: 'text-purple-600', bgColor: 'bg-purple-100', darkBgColor: 'dark:bg-purple-900/20' },
    { name: 'Diamond', min: 501, max: Infinity, color: 'text-blue-600', bgColor: 'bg-blue-100', darkBgColor: 'dark:bg-blue-900/20' },
  ];

  const currentLevel = creditLevels.find(level => user.creditBalance >= level.min && user.creditBalance <= level.max) || creditLevels[0];
  const nextLevel = creditLevels.find(level => level.min > user.creditBalance);
  const progressToNextLevel = nextLevel 
    ? ((user.creditBalance - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;

  // Credit earning tips
  const earningTips = [
    {
      icon: Target,
      title: 'Host Workshops',
      description: 'Share your expertise and earn 25-50 credits per workshop',
      credits: '+25-50',
    },
    {
      icon: Star,
      title: 'Get High Ratings',
      description: 'Maintain a 4.5+ rating to earn bonus credits',
      credits: '+5-10',
    },
    {
      icon: Gift,
      title: 'Referral Program',
      description: 'Invite friends and earn credits when they join',
      credits: '+20',
    },
  ];

  return (
    <div className="min-h-screen bg-background pt-20 lg:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Credits & History</h1>
          <p className="text-lg text-muted-foreground">
            Track your credit balance, earning history, and discover ways to earn more.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Credit Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Balance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Current Balance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-4xl font-bold">{user.creditBalance}</p>
                    <p className="text-muted-foreground">Available Credits</p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${currentLevel.bgColor} ${currentLevel.darkBgColor}`}>
                    <div className="flex items-center space-x-2">
                      <Award className={`w-5 h-5 ${currentLevel.color}`} />
                      <span className={`font-semibold ${currentLevel.color}`}>
                        {currentLevel.name}
                      </span>
                    </div>
                  </div>
                </div>

                {nextLevel && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">
                        Progress to {nextLevel.name}
                      </span>
                      <span className="text-sm font-medium">
                        {user.creditBalance}/{nextLevel.min} credits
                      </span>
                    </div>
                    <Progress value={progressToNextLevel} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {nextLevel.min - user.creditBalance} credits needed for {nextLevel.name}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">This Month Earned</p>
                      <p className="text-2xl font-bold text-secondary">+{monthlyEarned}</p>
                    </div>
                    <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-secondary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">This Month Spent</p>
                      <p className="text-2xl font-bold text-primary">-{monthlySpent}</p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Transaction History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="space-y-4">
                    {transactions.slice(0, 10).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            transaction.type === 'earned' 
                              ? 'bg-secondary/10 text-secondary' 
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {transaction.type === 'earned' ? (
                              <TrendingUp className="w-5 h-5" />
                            ) : (
                              <TrendingDown className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.timestamp).toLocaleDateString()} at {new Date(transaction.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            transaction.type === 'earned' ? 'text-secondary' : 'text-primary'
                          }`}>
                            {transaction.type === 'earned' ? '+' : '-'}{transaction.amount}
                          </p>
                          <p className="text-sm text-muted-foreground">credits</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No transactions yet</h3>
                    <p className="text-muted-foreground">
                      Your credit transactions will appear here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* How to Earn Credits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How to Earn Credits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {earningTips.map((tip, index) => {
                  const Icon = tip.icon;
                  return (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-secondary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">{tip.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {tip.credits}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{tip.description}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Credit System Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>Credit System</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">How it works</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Attend workshops: Spend credits</li>
                    <li>• Host workshops: Earn credits</li>
                    <li>• Credits don't expire</li>
                    <li>• Minimum 5 credits to attend</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Refund Policy</h4>
                  <p className="text-sm text-muted-foreground">
                    Cancel 24+ hours before: 80% refund<br />
                    Cancel within 24 hours: 50% refund<br />
                    Workshop cancelled: 100% refund
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Level Benefits</h4>
                  <div className="space-y-2">
                    {creditLevels.slice(0, 4).map((level) => (
                      <div key={level.name} className="flex items-center justify-between text-sm">
                        <span className={level.color}>{level.name}</span>
                        <span className="text-muted-foreground">
                          {level.min}{level.max !== Infinity ? `-${level.max}` : '+'} credits
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}