/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BusinessCard {
  id: string;               // ユニークID
  name: string;             // 氏名
  nameReading?: string;     // 氏名（ふりがな）
  company: string;          // 会社名
  title: string;            // 役職
  department?: string;      // 部署
  address: string;          // 住所
  phone: string;            // 電話番号
  mobile: string;           // 携帯番号
  email: string;            // メールアドレス
  website: string;          // Webサイト/URL
  notes?: string;           // メモ・その他
  scannedAt: string;        // 解析日時
  imageUrl?: string;        // 名刺画像のデータURI (Base64) - ローカル表示用
}
