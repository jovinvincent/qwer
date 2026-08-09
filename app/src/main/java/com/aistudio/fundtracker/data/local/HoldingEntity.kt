package com.aistudio.fundtracker.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.aistudio.fundtracker.model.AssetType
import com.aistudio.fundtracker.model.Position

@Entity(tableName = "holdings")
data class HoldingEntity(
    @PrimaryKey val id: String,
    val name: String,
    val symbol: String,
    val type: AssetType,
    val quantity: Double,
    val avgPrice: Double,
    val position: Position,
    val isin: String,
    val rating: String,
    val industry: String,
    val weight: Double,
    val ytm: String?,
    val marketValueLakhs: Double,
    val subCategory: String? = null
)
